# QA Testing Skills

Three Claude Code skills that form an end-to-end QA delivery workflow — from a PRD to live Xray test cases. Each skill is a `SKILL.md` file you load into Claude Code (or any Claude agent). They chain together but each can also be used stand-alone.

```
PRD / Feature spec
       │
       ▼
 test-knowledge-base  ──►  coverage-aware gap analysis
       │
       ▼
  test-strategist     ──►  risk-based test strategy document
       │
       ▼
 test-plan-creator    ──►  BDD/Cucumber test cases + Xray Test Plan + import
```

---

## Skills

### 1. `test-knowledge-base/`

Builds a structured map of what your existing Playwright/Cucumber suite already covers.

**What it does:**
- Runs a pure-Node script that parses all `*.feature` files and produces `catalog.json` — counts, scenario inventory, tags, Jira IDs, personas.
- Distils five human-readable markdown layers: `INDEX.md`, `personas.md`, `test-data.md`, `dependencies.md`, and per-domain files.
- Feeds the gap-analysis phase of `test-strategist` so new strategies are coverage-aware, not greenfield-assumption.

**Quick start:**
```bash
node path/to/test-knowledge-base/scripts/build-catalog.mjs --root "$(pwd)"
# or refresh and diff:
node path/to/test-knowledge-base/scripts/build-catalog.mjs --root "$(pwd)" \
  --diff ./knowledge-base/catalog.json
```

---

### 2. `test-strategist/`

Converts a PRD (or feature spec, epic, design doc) into a risk-based test strategy — the testing *approach*, not the test cases.

**What it does:**
- Extracts requirements, classifies by ISO 25010 quality characteristics, scores by business impact × failure likelihood × change surface.
- Allocates each area to the cheapest test layer (Unit → API/AAT → E2E → Production).
- Runs a gap analysis against the knowledge base to produce regression candidates + coverage gaps.
- Outputs a strategy document + clarifying-questions list. **Does not write test cases** — those come from `test-plan-creator`.

**When to use:** whenever someone provides a PRD and wants to know how to approach testing it.

---

### 3. `test-plan-creator/`

Turns a signed-off test strategy into executable BDD/Cucumber test cases and an Xray Test Plan.

**What it does:**
- Generates thin, atomic E2E Gherkin scenarios (one user flow per test) grounded in the strategy's risk priorities and any UAT flows.
- Assigns priorities: UAT flows → P0; others → risk-based P0–P3.
- Emits an Xray-importable Cucumber CSV (`references/csv-format.md`).
- Creates the Xray Test Plan in Jira via MCP (on approval) and imports tests via `scripts/import-to-xray.mjs`.

**Import script (dry-run safe by default):**
```bash
# Dry run — validates CSV, prints what would be created
node path/to/test-plan-creator/scripts/import-to-xray.mjs \
  --csv my_initiative_tests.csv --plan PROJ-1234

# Commit — creates Xray tests and links them to the plan
XRAY_CLIENT_ID=xxx XRAY_CLIENT_SECRET=yyy \
node path/to/test-plan-creator/scripts/import-to-xray.mjs \
  --csv my_initiative_tests.csv --plan PROJ-1234 --commit
```

**Requires Xray Cloud credentials** — get them from Jira → Apps → Xray → Global Settings → API Keys.

---

## Setup in Claude Code

1. Copy a skill folder (e.g. `test-strategist/`) into your repo under `.claude/skills/`.
2. In Claude Code, the skill is auto-discoverable. Invoke it via `/test-strategist` or reference it naturally ("write a test strategy for this PRD").
3. For `test-knowledge-base`, run the build script first to generate `catalog.json` before asking Claude to distil the markdown layers.
4. For `test-plan-creator`, configure your Xray / Jira credentials (see `test-plan-creator/SKILL.md` → Xray setup section).

---

## Adapting to your stack

| Thing to configure | Where |
|--------------------|-------|
| Jira project key | `PROJECT_KEY` env var for the import script; update references in `test-plan-creator/SKILL.md` |
| Priority names | `PRIORITY_MAP` in `test-plan-creator/scripts/import-to-xray.mjs` |
| Feature file paths | `--root` flag on the build script; update `source map` in `test-knowledge-base/SKILL.md` |
| E2E framework | Skills default to Playwright/Cucumber; adapt step vocabulary for your framework |
| Xray Cloud credentials | `XRAY_CLIENT_ID` + `XRAY_CLIENT_SECRET` env vars |

---

## Notes

- The skills work best chained in order, but each can be used standalone.
- `test-knowledge-base` only needs the script + Claude; no external dependencies.
- `test-plan-creator` produces a dry-run CSV you can review before any Jira writes.
- Granular/behavioral coverage (math, decline matrices, state-machine permutations) is deliberately out of scope for E2E — these skills route that work to your backend integration/AAT suite.
