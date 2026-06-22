#!/usr/bin/env node
/**
 * import-to-xray.mjs — import a Cucumber CSV of tests into Xray Cloud
 * and associate them to a feature-initiative Test Plan (Jira project).
 *
 * Pure Node (>=18, global fetch); no deps.
 * SAFE BY DEFAULT: dry-run unless --commit is passed.
 *
 * Usage:
 *   node import-to-xray.mjs --csv my_tests.csv --plan PROJ-1234 [--commit]
 *
 * Env (required only for --commit):
 *   XRAY_CLIENT_ID       — Xray Cloud API key client ID (Global Settings → API Keys)
 *   XRAY_CLIENT_SECRET   — Xray Cloud API key client secret
 * Optional:
 *   XRAY_BASE            — default https://xray.cloud.getxray.app
 *   PROJECT_KEY          — default PAY (change to your Jira project key)
 */

import fs from 'node:fs';

const args = process.argv.slice(2);
const getArg = (f, d) => { const i = args.indexOf(f); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
const CSV = getArg('--csv');
const PLAN = getArg('--plan');
const COMMIT = args.includes('--commit');
const XRAY_BASE = process.env.XRAY_BASE || 'https://xray.cloud.getxray.app';
const PROJECT_KEY = process.env.PROJECT_KEY || 'PAY';

if (!CSV || !PLAN) {
  console.error('Usage: node import-to-xray.mjs --csv <file.csv> --plan <PROJ-key> [--commit]');
  process.exit(1);
}

// Adjust priority values if your Jira project uses different names.
const PRIORITY_MAP = { P0: 'Critical', P1: 'Highest', P2: 'Medium', P3: 'Low' };

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', i = 0, inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0].trim() !== ''));
}

function rowsToObjects(rows) {
  const header = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => Object.fromEntries(header.map((h, idx) => [h, r[idx] ?? ''])));
}

function derivePriority(summary) {
  const m = summary.match(/\|\s*(P[0-3])\s*\|/);
  const p = m ? m[1] : null;
  return { code: p, jira: p ? PRIORITY_MAP[p] : null };
}

async function xrayAuth() {
  const res = await fetch(`${XRAY_BASE}/api/v2/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.XRAY_CLIENT_ID, client_secret: process.env.XRAY_CLIENT_SECRET }),
  });
  if (!res.ok) throw new Error(`Xray auth failed: ${res.status} ${await res.text()}`);
  return (await res.text()).replace(/^"|"$/g, '');
}

async function gql(token, query, variables) {
  const res = await fetch(`${XRAY_BASE}/api/v2/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
  return json.data;
}

const CREATE_TEST = `
mutation CreateCucumberTest($gherkin: String!, $jira: JSON!) {
  createTest(testType: { name: "Cucumber" }, gherkin: $gherkin, jira: $jira) {
    test { issueId jira(fields: ["key"]) }
    warnings
  }
}`;

const GET_PLAN = `
query($jql: String!) {
  getTestPlans(jql: $jql, limit: 1) { results { issueId jira(fields: ["key"]) } }
}`;

const ADD_TO_PLAN = `
mutation($issueId: String!, $testIssueIds: [String]!) {
  addTestsToTestPlan(issueId: $issueId, testIssueIds: $testIssueIds) { addedTests warning }
}`;

const raw = fs.readFileSync(CSV, 'utf8');
const tests = rowsToObjects(parseCsv(raw));
if (!tests.length) { console.error('No test rows parsed from CSV.'); process.exit(1); }

let bad = 0;
const planned = tests.map((t, n) => {
  const summary = t['Test Summary'] || '';
  const { code, jira } = derivePriority(summary);
  const labels = (t['Labels'] || '').split(';').map(s => s.trim()).filter(Boolean);
  const scenario = t['Scenario'] || '';
  if (!code) { console.warn(`  ! row ${n + 1}: no P0-P3 found in summary -> priority unset`); bad++; }
  if (!/^\s*@/.test(scenario) && !/Scenario/.test(scenario)) { console.warn(`  ! row ${n + 1}: scenario cell looks empty/malformed`); bad++; }
  return { summary, priorityCode: code, priorityJira: jira, labels, scenario };
});

console.log(`\nParsed ${planned.length} test(s) from ${CSV}`);
console.log(`Target: project ${PROJECT_KEY}, Test Plan ${PLAN}\n`);
for (const p of planned) console.log(`  [${p.priorityCode || '??'} -> ${p.priorityJira || 'UNSET'}] ${p.summary}`);

if (!COMMIT) {
  console.log(`\nDRY RUN (no changes). ${bad ? `${bad} warning(s) above. ` : ''}Re-run with --commit to create tests and add them to ${PLAN}.`);
  process.exit(bad ? 2 : 0);
}

if (!process.env.XRAY_CLIENT_ID || !process.env.XRAY_CLIENT_SECRET) {
  console.error('--commit requires XRAY_CLIENT_ID and XRAY_CLIENT_SECRET in env.');
  process.exit(1);
}
console.log('\nAuthenticating to Xray Cloud...');
const token = await xrayAuth();

const planData = await gql(token, GET_PLAN, { jql: `key = ${PLAN}` });
const planIssueId = planData?.getTestPlans?.results?.[0]?.issueId;
if (!planIssueId) throw new Error(`Test Plan ${PLAN} not found via Xray.`);

const createdIds = [];
for (const p of planned) {
  const jira = { fields: { summary: p.summary, project: { key: PROJECT_KEY }, labels: p.labels } };
  if (p.priorityJira) jira.fields.priority = { name: p.priorityJira };
  const data = await gql(token, CREATE_TEST, { gherkin: p.scenario, jira });
  const key = data?.createTest?.test?.jira?.key;
  const id = data?.createTest?.test?.issueId;
  if (id) createdIds.push(id);
  console.log(`  created ${key || id} -- ${p.summary}`);
  const warn = data?.createTest?.warnings;
  if (warn && warn.length) console.warn(`    warnings: ${JSON.stringify(warn)}`);
}

console.log(`\nAdding ${createdIds.length} test(s) to Test Plan ${PLAN}...`);
const addData = await gql(token, ADD_TO_PLAN, { issueId: planIssueId, testIssueIds: createdIds });
console.log(`  added: ${addData?.addTestsToTestPlan?.addedTests?.length ?? 0} tests`);
console.log(`\nDone. Verify in Jira: https://your-domain.atlassian.net/browse/${PLAN}`);
