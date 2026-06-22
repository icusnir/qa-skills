---
name: test-plan-creator
description: Turn a signed-off test strategy into the executable layer — a new Xray Test Plan for the feature initiative and the prioritized BDD/Cucumber test cases under it. This is the phase *after* `test-strategist` — the strategy defines the approach; this skill produces the actual test cases. Use when someone asks to "generate test cases", "write BDD scenarios", "create the test plan", or "turn this strategy into tests". Produces an Xray-importable Cucumber CSV and (on approval) creates the Test Plan issue via Jira MCP and imports the tests via the bundled import script.
---

# Test Plan & Test Case Creator (Xray / Cucumber)

Turn a signed-off **test strategy** into the executable layer: a new **Xray Test Plan** for the feature initiative and the **prioritized BDD/Cucumber test cases** under it. This is the phase *after* `test-strategist` — the strategy defines the approach; this skill produces the actual test cases.

## Scope & boundary — read first

- **E2E, user-flow oriented — not granular.** Generate **thin, atomic E2E scenarios: one focused user flow per test**. Every test is `@E2E`.
- **Granular/behavioral coverage is NOT generated here.** Money math, decline-code matrices, status-machine permutations, idempotency, cron edge cases → owned by the **backend integration/AAT suite**. *Name* them in the plan as backend coverage; do not emit them as E2E scenarios.
- **This skill writes test cases.** (`test-strategist` deliberately does not.) Ground every scenario in the inputs; never fabricate behavior or copy mock data as expected results.

## Inputs

**Required:**
- **PRD** — authoritative on data & business rules.
- **Test strategy** — risk priorities, scope, clarifying questions, layer allocation. Drives what to cover and at what priority.
- **Test Knowledge Base** (`knowledge-base/` produced by `test-knowledge-base` skill): `INDEX.md`, `domains/*.md`, `personas.md`, `test-data.md` — the house style, reusable steps, page objects, org matrix, and reuse map.

**Optional (use if present; no-op gracefully if absent):**
- **UAT test-cases doc** — product-authored E2E flows. **Every UAT flow → automate it, priority P0, Gherkin tag `@UAT`.** Treat the doc as PRD-level authority (it resolves design/PRD conflicts).
- **Design analysis** — flows, states, and the fake-data ledger (never assert mock values as expected results).
- **Capability Graph** — grounds expected behavior, dependencies, status lifecycles.

If a required input is missing, stop and ask — do not proceed on a fabricated basis.

## Workflow

### 1. Ingest & reconcile
Read the required inputs (+ optional if present). Build the candidate **user-flow list** from: the strategy's risk priorities, the UAT doc flows, the design flows, and the PRD scope. Reconcile conflicts using the authority order **PRD/UAT > Capability Graph (current behavior) > design (structure/states)**; surface unresolved strategy blockers rather than guessing.

### 2. Select & shape scenarios (E2E, atomic)
- One **focused user flow per scenario**; keep it end-to-end through the real UI (and the end-user payment link where relevant).
- **Reuse the framework KB:** prefer existing step vocabulary, parameter types, existing DataTable patterns, and existing page objects. Where the KB says a step/page is missing, write the scenario in the house style and **flag the automation gap** — don't invent framework APIs.
- Push logic permutations to the backend suite (note them); keep one or two happy paths + the highest-value failure path per flow at E2E.

### 3. Assign priority (P0–P3)
- **UAT-doc flows → P0** always.
- **Non-UAT → risk-based assessment P0–P3** grounded in the strategy risk bands + money-movement/criticality; non-UAT **can be P0** when warranted (not capped). Map High→P1, Medium→P2, Low→P3 *unless* criticality warrants P0.
- Record a one-line **priority rationale** per test.

### 4. Tag & title
- **Tag backbone** (Gherkin tags inside the scenario): feature-level `@ServiceOrg @UIRegression @<Domain> @<EPIC> @E2E @<FlowTheme>`; scenario-level `@<JiraSubtask?> @Stage @Devint01 @<flag>` + `@UAT` for UAT-sourced flows. **`@<EPIC>` = the feature initiative's epic key — NOT the regression plan's epic key** (confirm the initiative epic).
- **Title** (CSV `Test Summary`): `E2E | <Domain> | {P0|P1|P2|P3} | {Flow Theme} | {Scenario Title}` — e.g. `E2E | Payments | P0 | One-time Payment | New One-Time Payment Flow – Manual Card Entry`.

### 5. Pick the org / persona
Choose `{organization}` per the capability the flow needs, from your test framework's org matrix (e.g. a full-capability org, a standalone org, capability-gating orgs for negative/gating flows). Flag any new org that needs onboarding.

### 6. Produce artifacts
1. **Test Plan (new)** — see `references/test-plan-template.md`. Summary `<Domain> | {Initiative} | QE | Test Plan`; use the house shape. Created via the **Jira MCP** (`createJiraIssue`, project `<YOUR_PROJECT>`, issuetype `Test Plan`). **Never attach to or reuse the regression plan.**
2. **Cucumber CSV** — see `references/csv-format.md`. One row per test; full Gherkin in the `Scenario` cell.
3. **Import script invocation** — `scripts/import-to-xray.mjs` imports the CSV's tests via the Xray Cloud REST API and associates them to the new Test Plan key.
4. **Coverage map** (scenario → strategy risk item / UAT flow / PRD AC) and **backend-delegation list** (granular items routed to the backend suite).

### 7. Confirm before writing live
Creating Jira issues and importing tests is outward-facing and hard to reverse. **Present the Test Plan summary/description + the generated test list (titles, priorities, tags, coverage map) for review first.** Create the live Test Plan and run the import **only after explicit approval**. Default to a **dry run** of the import script.

## Outputs

| Artifact | How |
|----------|-----|
| **Xray Test Plan** | New issue in your project via Jira MCP — never the regression plan |
| **Prioritized BDD test cases** | Cucumber CSV (`{initiative}_xray_tests.csv`), titles `E2E \| <Domain> \| {P0–P3} \| {Flow} \| {Title}` |
| **Import** | `scripts/import-to-xray.mjs` → Xray Cloud REST API, attaches tests to the plan |
| **Coverage map + backend-delegation list** | In the chat / a companion markdown |

## Xray / Jira setup (configure for your instance)

The import script and this skill need the following configured for your Jira Cloud instance:

| Parameter | Where to set | Example |
|-----------|-------------|---------|
| `XRAY_CLIENT_ID` | env var | from Xray Cloud Global Settings → API Keys |
| `XRAY_CLIENT_SECRET` | env var | from Xray Cloud Global Settings → API Keys |
| `XRAY_BASE` | env var (optional) | `https://xray.cloud.getxray.app` (default) |
| `PROJECT_KEY` | env var (optional) | `PAY`, `QA`, etc. (default `PAY`) |
| Jira Cloud ID | hardcode or env | from `https://your-domain.atlassian.net/rest/api/3/serverInfo` |
| Test Plan issuetype ID | check your instance | typically `10548` in Xray Cloud |
| Priority field values | Jira project config | `Critical`, `Highest`, `Medium`, `Low` — or your project's values |

**Priority mapping used by this skill:** P0→Critical, P1→Highest, P2→Medium, P3→Low. Adjust in `scripts/import-to-xray.mjs` if your project uses different priority names.

## Self-discipline

- **Ground every scenario** in PRD/UAT/strategy; no fabricated behavior; **no mock values as expected results**.
- **E2E user-flow only; atomic; granular → backend suite.** Don't drift into behavioral-granular cases here.
- **Reuse before inventing** — use existing steps/page objects; flag genuine automation gaps, don't invent framework APIs.
- **Confirm before creating live Jira issues / importing.** Dry-run first.
- **Never touch the regression plan.** New plan per initiative.
