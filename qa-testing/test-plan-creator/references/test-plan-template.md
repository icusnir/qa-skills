# Xray Test Plan — Template

Create the Test Plan as a new **Test Plan** issue in your Jira project via the Jira MCP (`createJiraIssue`). **Never reuse or attach to an existing regression plan** — each initiative gets its own Test Plan.

- **Summary:** `<Domain> | {Initiative} | QE | Test Plan` — e.g. `Payments | Payment Schedules | QE | Test Plan`.
- **Labels:** `<Domain>;QE;{InitiativeLabel}` (e.g. `Payments;QE;PaymentSchedules`).
- **Description:** follow the high-level house structure below. Keep it high-level — detailed cases live in the linked Tests.

## Description structure

```markdown
## 🔗 Quick Links
- PRD — <link or PRD.md path>
- Testing Strategy — <link or strategy doc path>
- (optional) Design Analysis, Capability Graph, UAT doc

## 🔍 Objective
2–4 lines: what this plan validates for {Initiative} in non-prod, and the focus areas (the strategy's High-risk areas).

## 📥 Scope
### In Scope
- The E2E user-flow areas this plan's tests cover (from the strategy + UAT flows).
### Out of Scope
- Verbatim from the PRD/strategy. Note granular/behavioral coverage is owned by the **backend integration suite**, not this plan.

## ⚙️ Test Approach
- Sources of truth: PRD + Testing Strategy (+ UAT doc at PRD-level authority).
- E2E tests = **user-flow oriented** (one flow per test); logic permutations delegated to the backend suite.
- Levels validated: Functional/API (backend suite), Integration/E2E (this plan), Data/analytics where relevant.

## 🌎 Environments
- **<Env 1>** — integration / day-to-day regression / negative paths.
- **<Env 2>** — final validation & sign-off; high-priority happy paths.

## 📊 Test Data (high level)
- Orgs / tenants: which capability orgs this initiative needs.
- Payment methods / accounts: success + failure-forcing.
- Config / feature flags: the initiative's feature gate; capability flags.

## 📋 Coverage Overview (high-level)
| Area | What we validate | Main env(s) | Priority focus |
| --- | --- | --- | --- |
| ... (one row per flow theme) | ... | Env1, Env2 | P0/P1 ... |

## 🚀 Execution Strategy
- Smoke pack (per deploy): <name the P0/P1 flows>
- Regression pack (per release): all P0→P3 cases

## 🚪 Entry Criteria
- Strategy blockers resolved; feature flag available; test data/orgs ready; build deployed.

## 🚪 Exit Criteria
- Planned P0/P1 executed; no open Sev1/Sev2; remaining issues triaged; sign-off.

## 📈 Reporting
- Execution tracked in Xray (by env); status in standups / readiness review.

## ⚠️ Risks & Mitigations
| Risk | Mitigation |
| --- | --- |
| ... (carry the strategy's delivery/testing risks) | ... |

## ✅ Approvals
| Role | Name | Approval | Date |
| Product / Engineering / QE Lead | | | |
```

After creation, capture the new Test Plan **key** (e.g. `PROJ-XXXX`) — the import script needs it (`--plan PROJ-XXXX`) to associate the imported tests.
