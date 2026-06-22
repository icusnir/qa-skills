# Test Strategy — Document Template

Use the conventional, section-based structure below. It is deliberately familiar to QA stakeholders. Fill it **proportionally to the feature** — a one-screen feature does not need every section expanded; cut or collapse sections that genuinely don't apply rather than padding them with boilerplate.

Two things make this more than a generic template, and they must stay grounded in the actual PRD:
- **§5 Test Approach** carries the **risk-based priorities** (the ~20% of requirements holding ~80% of the risk) — this drives coverage depth.
- **§5 also carries the clarifying questions** — ambiguous, untestable, or missing requirements routed back to the author. This is often the highest-value output; never drop it.

Keep it readable. Avoid academic apparatus (no ISO-25010 labelling in the document, no exhaustive traceability matrix unless asked). Prefer fewer, specific, PRD-grounded statements over volume. This is a **reviewed draft** until a QE signs off — say so.

```markdown
# Test Strategy: [Feature / initiative name]

**Source PRD:** [link or path]   **Design analysis:** [link, if ingested]
**Status:** DRAFT — requires QE review & sign-off   **Date:** [date]

## 1. Overview
2–4 sentences: what the feature does, and the headline of where testing effort is concentrated and why.

## 2. Objectives
What this testing effort must achieve, specific to this feature (not generic boilerplate). Tie to the feature's actual risks — e.g. "verify payment-amount math and scheduling dates are correct", "confirm cancellation leaves no orphaned transactions".

## 3. Scope
- **In scope:** features/stories covered.
- **Out of scope:** captured verbatim from the PRD — this bounds the strategy.
- **Assumptions:** any unresolved ambiguity proceeded on; each also appears in §5 clarifying questions.

## 4. Test Levels & Types
Which levels apply and what each covers for this feature — Unit, API/Integration, E2E (Playwright), and the production/shift-right checks (for payments: synthetic transactions, canary/flagged rollout, reconciliation & anomaly alerts). Place each area at the cheapest layer that meaningfully verifies it; keep E2E to thin critical journeys. A short table is fine:

| Area / requirement | Level | Notes |
|--------------------|-------|-------|
| ... | Unit / API / E2E / Prod | ... |

## 5. Test Approach
Risk-based. State the depth rule applied:
- **High** — full coverage (positive, negative, boundary, cross-feature); runs on every relevant change.
- **Medium** — targeted subset of key paths.
- **Low** — smoke check only.

**Risk priorities** — the ~20% carrying ~80% of the risk, with one-line reasoning each:

| Area | Risk | Why |
|------|------|-----|
| ... | High/Med/Low | money movement / complexity / blast radius |

**Clarifying questions** — ambiguous, untestable, or missing requirements routed back to the PRD author. Mark blockers. (Highest-value section — keep it sharp.)

**Items needing domain/compliance sign-off** — where a human must define "correct" (fee/rounding/currency math, regulatory disclosures, KYC/AML, settlement/reconciliation). List only if applicable.

## 6. Test Environment
Environments used and any feature-specific constraints (feature-flag gating, env-specific orgs/personas, third-party sandboxes like Stripe/QBO).

## 7. Test Data
Concrete data this feature needs — reuse existing fixtures/personas where possible (cite the Knowledge Base `test-data.md` / `personas.md` when available). Call out boundary values, failure-forcing accounts, and any data/persona the feature needs that does not exist yet.

## 8. Automation Strategy
What gets automated and at which layer vs. what stays manual/exploratory. Drive logic permutations down to unit/API; keep E2E thin.

## 9. Entry / Exit Criteria
- **Entry:** what must be true to start (requirements reviewed, env ready, build deployed, data prepared, dependencies available).
- **Exit:** what defines done (planned cases executed, blocker/critical defects resolved, regression complete, results signed off).
Keep these tight — a few bullets each, feature-specific where it matters.

## 10. Risks & Mitigations
Delivery/testing risks (not the requirement-risk table from §5) — environment instability, dependency availability, data gaps — each with a mitigation.

## 11. Deliverables
What this *strategy* stage produces: this strategy document, the clarifying-questions list, and (when a Knowledge Base or test export exists) the gap analysis. Test cases / Gherkin scenarios, automated scripts, and the execution report are deliverables of the later **test-plan phase**, not this document — name them as downstream, don't produce them here.

## 12. Roles & Responsibilities
Who owns what for this feature. Keep to roles actually involved; don't pad.

---

## Appendix A: Gap analysis (when a Knowledge Base or test export exists)
Regression candidates (existing scenarios in the change surface, with @Jira IDs) and coverage gaps (requirements with no existing test), per phase 5 of the skill workflow.

> Test cases / Gherkin scenarios are **not** part of the strategy. They are generated later in the test-plan phase, informed by this strategy's risk priorities and gap analysis.
```
