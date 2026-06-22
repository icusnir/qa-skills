#!/usr/bin/env node
/**
 * build-catalog.mjs — deterministic parser for the test-payments-knowledge-base skill.
 *
 * Scans every *.feature file under the UI and API modules and emits a single
 * machine-readable catalog.json describing the test surface: features,
 * scenarios, tags, Jira tickets, and the personas (org x role) each scenario
 * exercises. No external dependencies — pure Node fs + regex.
 *
 * Usage:
 *   node build-catalog.mjs [--root <repoRoot>] [--out <catalog.json>] [--diff <previous.json>]
 *
 * Exit code is always 0 on a successful parse. When --diff is supplied, a
 * change summary is printed to stderr so a refresh run can see what moved.
 */

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const REPO_ROOT = path.resolve(getArg('--root', process.cwd()));
const OUT = path.resolve(getArg('--out', path.join(REPO_ROOT, '.claude/skills/test-payments-knowledge-base/payments-knowledge-base', 'catalog.json')));
const DIFF = getArg('--diff', null);

// Directories that hold feature files. Add to this list if the repo grows new ones.
const FEATURE_ROOTS = [
  'ui-module/features',
  'api-module/test/features',
  'aws-module', // aws-module may hold feature files too; harmless if empty
];

/** Recursively collect *.feature paths, skipping node_modules. */
function collectFeatureFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFeatureFiles(full, acc);
    else if (entry.isFile() && entry.name.endsWith('.feature')) acc.push(full);
  }
  return acc;
}

/** Derive a stable domain key from the file path (segment right after `features/`). */
function deriveDomain(relPath) {
  const norm = relPath.replace(/\\/g, '/');
  const m = norm.match(/features\/([^/]+)\//);
  if (m) return m[1].toLowerCase();
  // aws-module or other layout: use the second path segment as a fallback
  const parts = norm.split('/');
  return (parts[1] || parts[0] || 'unknown').toLowerCase();
}

const TAG_RE = /@[A-Za-z0-9_-]+/g;
const JIRA_RE = /@([A-Z][A-Z0-9]+-\d+)/g;
// "ORG_NAME ROLE_NAME user logs into" — captures the persona used to drive the scenario.
const PERSONA_RE = /([A-Z][A-Z0-9_]+)\s+([A-Z][A-Z0-9_]+)\s+user logs into/g;

function extractTags(line) {
  return line.match(TAG_RE) || [];
}
function extractJira(tags) {
  const out = [];
  for (const t of tags) {
    const m = [...t.matchAll(JIRA_RE)];
    for (const x of m) out.push(x[1]);
  }
  return out;
}

/** Parse one feature file into a structured record. */
function parseFeature(absPath) {
  const relPath = path.relative(REPO_ROOT, absPath).replace(/\\/g, '/');
  const text = fs.readFileSync(absPath, 'utf8');
  const lines = text.split(/\r?\n/);

  const module = relPath.startsWith('api-module') ? 'api'
    : relPath.startsWith('aws-module') ? 'aws' : 'ui';
  const domain = deriveDomain(relPath);

  let featureTitle = '';
  let featureTags = [];
  let pendingTags = [];
  const scenarios = [];
  let current = null; // scenario being accumulated

  const flushScenario = () => {
    if (!current) return;
    const personaMatches = [...current.body.matchAll(PERSONA_RE)].map(
      (m) => `${m[1]} ${m[2]}`,
    );
    current.personas = [...new Set(personaMatches)];
    delete current.body;
    scenarios.push(current);
    current = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('@')) {
      pendingTags.push(...extractTags(line));
      continue;
    }
    if (line.startsWith('Feature:')) {
      featureTitle = line.replace('Feature:', '').trim();
      featureTags = [...new Set(pendingTags)];
      pendingTags = [];
      continue;
    }
    const scenMatch = line.match(/^(Scenario Outline|Scenario):\s*(.*)$/);
    if (scenMatch) {
      flushScenario();
      const ownTags = [...new Set(pendingTags)];
      pendingTags = [];
      const allTags = [...new Set([...featureTags, ...ownTags])];
      current = {
        scenario: scenMatch[2].trim(),
        type: scenMatch[1] === 'Scenario Outline' ? 'outline' : 'scenario',
        tags: ownTags,
        jira: extractJira(allTags),
        body: '',
      };
      continue;
    }
    // Background / Rule / steps / examples → part of current scenario body
    if (current) current.body += raw + '\n';
  }
  flushScenario();

  const fileJira = extractJira(featureTags);
  const allScenarioJira = scenarios.flatMap((s) => s.jira);
  const allPersonas = [...new Set(scenarios.flatMap((s) => s.personas))];

  return {
    file: relPath,
    module,
    domain,
    feature: featureTitle,
    featureTags,
    jira: [...new Set([...fileJira, ...allScenarioJira])],
    personas: allPersonas,
    scenarioCount: scenarios.filter((s) => s.type === 'scenario').length,
    outlineCount: scenarios.filter((s) => s.type === 'outline').length,
    scenarios: scenarios.map((s) => ({
      id: `${relPath}::${s.scenario}`,
      scenario: s.scenario,
      type: s.type,
      tags: s.tags,
      jira: s.jira,
      personas: s.personas,
    })),
  };
}

// ---- Build catalog ----
const files = FEATURE_ROOTS.flatMap((r) => collectFeatureFiles(path.join(REPO_ROOT, r)));
const features = files.map(parseFeature).sort((a, b) => a.file.localeCompare(b.file));

// Roll up per-domain aggregates
const domains = {};
for (const f of features) {
  const d = (domains[f.domain] ||= {
    domain: f.domain,
    modules: new Set(),
    featureFiles: 0,
    scenarios: 0,
    outlines: 0,
    jira: new Set(),
    personas: new Set(),
    tags: new Set(),
  });
  d.modules.add(f.module);
  d.featureFiles += 1;
  d.scenarios += f.scenarioCount;
  d.outlines += f.outlineCount;
  f.jira.forEach((j) => d.jira.add(j));
  f.personas.forEach((p) => d.personas.add(p));
  f.featureTags.forEach((t) => d.tags.add(t));
}

// Persona usage rollup
const personaUsage = {};
for (const f of features) {
  for (const p of f.personas) {
    const u = (personaUsage[p] ||= { persona: p, org: p.split(' ')[0], role: p.split(' ')[1], files: 0, domains: new Set() });
    u.files += 1;
    u.domains.add(f.domain);
  }
}

const setToArr = (s) => [...s].sort();
const catalog = {
  generatedAt: new Date().toISOString(),
  repoRoot: path.basename(REPO_ROOT),
  totals: {
    featureFiles: features.length,
    scenarios: features.reduce((n, f) => n + f.scenarioCount, 0),
    outlines: features.reduce((n, f) => n + f.outlineCount, 0),
    domains: Object.keys(domains).length,
    personas: Object.keys(personaUsage).length,
    jiraTickets: new Set(features.flatMap((f) => f.jira)).size,
  },
  domains: Object.values(domains)
    .map((d) => ({
      domain: d.domain,
      modules: setToArr(d.modules),
      featureFiles: d.featureFiles,
      scenarios: d.scenarios,
      outlines: d.outlines,
      jira: setToArr(d.jira),
      personas: setToArr(d.personas),
      tags: setToArr(d.tags),
    }))
    .sort((a, b) => b.scenarios + b.outlines - (a.scenarios + a.outlines)),
  personas: Object.values(personaUsage)
    .map((u) => ({ persona: u.persona, org: u.org, role: u.role, files: u.files, domains: setToArr(u.domains) }))
    .sort((a, b) => b.files - a.files),
  features,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(catalog, null, 2) + '\n');

// ---- Console summary ----
const t = catalog.totals;
process.stdout.write(
  `Catalog written: ${path.relative(REPO_ROOT, OUT)}\n` +
  `  ${t.featureFiles} feature files | ${t.scenarios} scenarios + ${t.outlines} outlines\n` +
  `  ${t.domains} domains | ${t.personas} personas | ${t.jiraTickets} Jira tickets\n`,
);

// ---- Optional diff vs a previous catalog (for refresh runs) ----
if (DIFF && fs.existsSync(DIFF)) {
  try {
    const prev = JSON.parse(fs.readFileSync(DIFF, 'utf8'));
    const prevIds = new Map();
    for (const f of prev.features || []) for (const s of f.scenarios || []) prevIds.set(s.id, s);
    const curIds = new Map();
    for (const f of catalog.features) for (const s of f.scenarios) curIds.set(s.id, s);

    const added = [...curIds.keys()].filter((id) => !prevIds.has(id));
    const removed = [...prevIds.keys()].filter((id) => !curIds.has(id));
    const changed = [...curIds.keys()].filter((id) => {
      if (!prevIds.has(id)) return false;
      return JSON.stringify(prevIds.get(id).tags) !== JSON.stringify(curIds.get(id).tags);
    });

    const affectedDomains = new Set();
    for (const id of [...added, ...removed, ...changed]) {
      const file = id.split('::')[0];
      affectedDomains.add(deriveDomain(file));
    }

    process.stderr.write(
      `\n=== Refresh diff vs ${path.basename(DIFF)} ===\n` +
      `  + ${added.length} added | - ${removed.length} removed | ~ ${changed.length} retagged\n` +
      `  Domains to re-distill: ${[...affectedDomains].sort().join(', ') || '(none)'}\n`,
    );
    if (added.length) process.stderr.write('  Added:\n' + added.map((i) => '    + ' + i).join('\n') + '\n');
    if (removed.length) process.stderr.write('  Removed:\n' + removed.map((i) => '    - ' + i).join('\n') + '\n');
  } catch (e) {
    process.stderr.write(`\n(diff skipped: ${e.message})\n`);
  }
}
