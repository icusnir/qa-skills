---
name: test-strategist
description: Turn a PRD (or feature spec, epic, design doc) into a defensible, risk-based test strategy — the testing *approach*, not the test cases. Use this skill whenever someone provides a product requirements document, feature brief, user story set, or design spec and wants to know how to approach testing it — including requests like "write a test strategy", "how should we test this feature", "what test coverage do we need", "what's our QA approach", or "what are the risks and edge cases here". Trigger it proactively when a requirements artifact is shared in a QA/testing context even if the word "strategy" isn't used, and when someone asks for a coverage analysis or risk assessment derived from a spec. This skill defines the approach only — it does NOT write test cases or Gherkin scenarios; those are produced later in the separate test-plan phase. Framework-agnostic; defaults the E2E layer to Playwright.
---

# Test Strategy from PRD

Convert a requirements artifact into a defensible, risk-based test strategy. The job is not to dump every conceivable test case — it is to (1) extract and pin down what the feature actually promises, (2) decide *where* each thing should be tested and *how deeply*, and (3) surface what the PRD failed to specify before any of it gets written.

The single highest-value output is often the **clarifying-questions list**: an undefined error state or missing acceptance criterion caught at strategy time is far cheaper than a flaky E2E test discovered three sprints later.

**Scope boundary — read this first.** This skill produces the test *strategy*: the approach, scope, risk priorities, layer allocation, environment/data needs, and clarifying questions. It **stops at the approach**. It does **not** write test cases or Gherkin scenarios — those are generated later in the separate **test-plan phase**, informed by this strategy. If asked to produce test cases here, decline and point to the test-plan phase.

## Inputs

- **`PRD.md`** — *required*. The primary input: a product requirements document, feature brief, user-story set, or design spec provided as a local markdown file. The strategy can run from this alone, and everything in it must be grounded here — missing detail becomes a clarifying question, not a fabricated requirement.
- **QA Design Analysis** — *optional but preferred when a design exists*. The markdown document produced by the `design-analyser` skill (shape defined in `../design-analyser/references/output-schema.md`). Ingest it for states, flows, fields, the fake-data ledger, and open questions. The PRD is authoritative on data and rules; the design analysis is authoritative on structure and states; conflicts between them are findings to raise.
- **Test Knowledge Base** — *optional but strongly preferred*. The `.claude/skills/test-payments-knowledge-base/payments-knowledge-base/` directory produced by the `test-payments-knowledge-base` skill (see `../test-payments-knowledge-base/references/output-schema.md`). It maps what the existing Playwright/Cucumber suite already covers — `INDEX.md` (domain → capability → coverage), `domains/*.md` (per-domain scenarios with Jira IDs), `personas.md`, `test-data.md`, and `dependencies.md`. This is the primary input to the gap analysis (phase 5) and the source of reusable personas/fixtures. If it looks stale, refresh it first by running the `test-payments-knowledge-base` skill.
- **Payments Capability Graph (BE + FE)** — *optional; applies to the Payments area only*. The CDD Capability Graphs in `project-context-payments-be/` (the `payment-pos-service` API) and `project-context-payments-fe/` (the `pay-mfe` micro-frontend). They are the authoritative source for **how the system actually behaves**: per-capability `verification.md` (critical scenarios + edge cases), `dependencies.md` (cross-capability + external-system dependencies with failure modes), `intent-catalog.json` (entity lifecycle state machines), `manifest.json` (stack, test infra, environments, feature flags), and `initiatives/*/execution-plan.md` (worked PRD → capability-impact mapping). Use it the same tiered way as the Knowledge Base — `capabilities.json` to locate, then the specific capability's facets. See "Using the Payments Capability Graph" below for the facet → section mapping and the authority/drift caveats. The Knowledge Base (what we *test*) and the Capability Graph (what the system *does*) are complementary: trace PRD requirement → capability (Graph) → existing coverage (KB) → gap.
- **Existing test suite / test-management export** — *optional*. An alternative/supplement to the Knowledge Base for the gap analysis (phase 5): coverage gaps, regression candidates, and orphan tests. Absent both, coverage is assumed greenfield.
- **Code-coverage report** — *optional*. Used as a gap-finder against the change surface, never as a target.
- **Domain / compliance reference** — *optional*. Source of record for fee math, rounding/currency rules, disclosures, KYC/AML, and settlement logic — the places where a human must define "correct."

## Workflow

Work through these phases in order. Don't skip ahead to writing test cases — the value is in the analysis that comes first.

### 1. Extract requirements

Read the PRD and pull out a structured inventory:
- **Features / user stories** — what the user can do.
- **Acceptance criteria** — the measurable conditions of done. Flag any AC that has no observable outcome ("works well", "is fast") as untestable.
- **Non-functional requirements** — performance budgets, security, accessibility, data integrity, compliance. Payments specifically: idempotency, retries, reconciliation, audit trail, currency/rounding rules, PCI-scope boundaries.
- **Dependencies** — upstream/downstream services, third-party providers, feature flags.
- **Explicit out-of-scope** — what the PRD says it is *not* doing. Capture this verbatim; it bounds the strategy.

If a Figma design accompanies the PRD, run the `design-analyser` skill first and ingest its QA Design Analysis here. Use its states, flows, and fields to enrich requirements, and its fake-data ledger and open-questions list as inputs. Remember the division: the PRD is authoritative on data and rules; the design is authoritative on structure and states; conflicts between them are findings to raise.

### 2. Classify and score testability

Tag each requirement by type and give it a testability score: can it be verified as written? Low-testability items go straight onto the clarifying-questions list. Don't quietly invent the missing detail — name the gap.

Use the ISO/IEC 25010 product-quality characteristics as the classification vocabulary — they form a clean bridge from "what could go wrong" to "what kind of testing addresses it", and give stakeholders a shared language:

| What could go wrong | ISO 25010 characteristic | Typical test type |
|---------------------|--------------------------|-------------------|
| Wrong or missing behavior | Functional suitability | Unit, API, E2E |
| Slow / can't handle load | Performance efficiency | Load, stress, soak |
| Breaks with other systems/APIs/formats | Compatibility / Interoperability | Contract, integration |
| Hard to use, inaccessible | Usability (incl. accessibility) | UI, a11y audit |
| Fails, loses data, won't recover | Reliability | Resilience, idempotency, recovery |
| Exposes or corrupts data | Security | Auth, injection, PCI-scope checks |
| Hard to change safely | Maintainability | Regression, change-surface |
| Won't run across environments | Portability | Cross-env / cross-browser |

A single requirement often maps to several characteristics — a payment regression risk is both functional suitability *and* reliability. Don't force one label; record all that apply, because each pulls in a different test type at a different layer.

### 3. Prioritize by risk

Score each feature on three axes and combine them:

```
Risk = Business impact  ×  Failure likelihood  ×  Change surface
```

- **Business impact** — money lost, customers blocked, compliance breach, reputational damage. In payments, anything touching money movement, balances, or settlement is high by default.
- **Failure likelihood** — complexity, number of integration points, novelty, historical defect density in this area if known.
- **Change surface** — how much existing behavior this touches (blast radius for regressions).

Use a simple High/Medium/Low per axis, then a clear overall band. Apply the Pareto lens: find the ~20% of requirements that carry ~80% of the risk and concentrate effort there. Write the reasoning down — the risk priorities and their rationale are part of the strategy (they live in the §5 risk-priorities table), and in regulated/payments work they're what you point to when someone asks why an area was tested lightly.

**The risk band sets execution depth directly.** Make this rule explicit in the strategy so coverage is defensible:
- **High** — full layered coverage: positive, negative, boundary, and cross-feature paths; runs on every relevant change.
- **Medium** — a targeted subset of the most important paths; runs on changes touching the area.
- **Low** — smoke check only.

### 4. Allocate to test layers

Place each requirement at the **cheapest layer that can meaningfully verify it**. Pushing everything to E2E is the most common and most expensive mistake. Default layer model:

| Layer | Scope | Owner | Good for |
|-------|-------|-------|----------|
| Unit | Single function/module, no I/O | Dev | Calculation logic, validation rules, rounding, state machines |
| API / integration | Service contracts, multi-step flows across services | QE | Endpoint contracts, idempotency, retries, auth, error envelopes, data persistence |
| **E2E (Playwright)** | Thin user-journey happy paths through the real UI | QE | Critical end-to-end journeys only — login → pay → confirmation; do **not** push business-logic permutations here |
| Production (shift-right) | Real traffic under controlled exposure | QE + SRE | Synthetic transaction monitoring, canary/feature-flag rollout, reconciliation & anomaly alerts |

The first three layers are shift-left (catch defects early and cheaply). Pair them with a shift-right layer: a healthy split is roughly 70–80% of effort left and 20–30% right, because staging can never fully reproduce production load, real third-party behavior, or real user patterns. For payments, the shift-right layer is not optional polish — synthetic test transactions, canary releases behind flags, and reconciliation/anomaly alerts are how money-movement defects get caught before they reach every customer. Name the specific production checks in the strategy.

Design tests around **real data scenarios, not invented happy-path values** — actual instrument types, ledger states, currencies, and boundary amounts that mirror production — so edge cases surface instead of hiding behind tidy fixtures.

- Keep it thin. One or two happy paths per critical journey, plus the highest-value failure path (e.g. declined payment).
- Drive logic permutations (every decline code, every boundary amount) down to the API or unit layer where they run faster and aren't flaky.
- Prefer role/label selectors and network stubbing for deterministic third-party (payment processor) responses.

Apply the inverse test pyramid sanity check: if most of the strategy's coverage sits at E2E, rebalance downward before finalizing.

### 5. Gap analysis against existing tests

Map requirements to existing tests. The preferred source is the **Test Knowledge Base** (`.claude/skills/test-payments-knowledge-base/payments-knowledge-base/`, built by the `test-payments-knowledge-base` skill); an existing test repository or test-management export works too.

When the Knowledge Base is available:
1. Load `.claude/skills/test-payments-knowledge-base/payments-knowledge-base/INDEX.md` and identify which existing domain(s) the PRD touches.
2. Open the relevant `domains/*.md` to enumerate **regression candidates** (existing behavior in the change surface — cite the scenario titles and `@Jira` IDs) and **coverage gaps** (PRD requirements with no existing scenario).
3. Pull reusable **personas** (`personas.md`) and **test data / fixtures** (`test-data.md`) so the eventual test cases (built later in the test-plan phase) reuse established setup instead of inventing it; flag any persona or fixture the PRD needs that does not yet exist (e.g. a role lacking a permission, for an RBAC negative test).
4. Note inherited **dependencies and constraints** (`dependencies.md`) — environment tagging, cleanup requirements, external integrations without an existing harness.

If the Knowledge Base looks stale relative to the current suite, refresh it first (run `test-payments-knowledge-base`). If neither a Knowledge Base nor a test export is provided, note that the strategy assumes greenfield coverage and recommend building the Knowledge Base (run `test-payments-knowledge-base`) before the gap pass.

Also identify orphan tests (tests for things no longer in scope) where the inputs make them visible.

Use code-coverage data, if available, as a gap-finder rather than a target. Coverage shows how thoroughly parts of the app are exercised and surfaces untested areas; chasing a coverage percentage as a goal produces shallow assertions. Point it at the change surface to confirm the risky paths are actually covered.

### 6. Assemble the strategy document

Use the conventional, section-based template in `references/strategy-template.md`. The analysis from phases 1–5 feeds *into* those familiar sections rather than appearing as standalone academic artifacts — keep the document readable and proportional to the feature. In particular:
- The phase-2 ISO-25010 classification is an **internal lens** to choose test types; do **not** add an ISO-25010 section or labels to the document.
- The phase-3 risk scoring lands as the **risk-priorities table inside §5 Test Approach**, not a separate heavyweight register.
- The phase-4 layer allocation lands in **§4 Test Levels & Types**.

Stop at the approach. **Do not write test cases or Gherkin scenarios** — that is the test-plan phase's job.

## Using the Payments Capability Graph

When the Payments Capability Graph is available (`project-context-payments-be/`, `project-context-payments-fe/`), fold it into the phases above with this facet → section mapping:

| Graph facet | Feeds |
|-------------|-------|
| `capabilities.json` + `initiatives/*/execution-plan.md` (capability-impact table) | **Scoping & gap analysis (phase 5)** — identify which capabilities the PRD touches; cross-reference to existing coverage in the KB |
| Per-capability `verification.md` (critical scenarios + edge cases) | **Risk identification (phase 3)** and downstream test-plan inputs — surfaces status transitions, validation, org-scoping, known edge cases |
| Per-capability `dependencies.md` (cross-capability + external systems + failure modes) | **Risk priorities (§5)** and **Risks & Mitigations (§10)** — blast radius, regression candidates, async/idempotency/scheduler failure modes |
| `intent-catalog.json` (entity lifecycle state machines) | **Risk (phase 3)** — the state machines that dominate payment risk |
| `manifest.json` (test infra, environments, feature flags) | **Test Levels & Types (§4)**, **Test Environment (§6)**, **Automation (§8)** — AAT/contract tests, LaunchDarkly gating, env list |
| `project.md` (workflows, terminology, integrations) | **Overview (§1)** and shared vocabulary |

**Bridging BE and FE:** there is no shared capability-ID scheme across the two graphs — link them by name (e.g. BE `CAP-004 Subscription Payments` ↔ FE `CAP-003 Subscription Payments`), not by ID.

**Authority & drift caveats — do not violate:**
- The Graph is authoritative on **current/implemented** behavior, **not on correct behavior**. It is AI-generated from the repos, so a bug becomes "documented behavior." Never derive an expected outcome from the Graph alone — the PRD and domain experts define "correct." A strategy that just mirrors the Graph confirms consistency, not correctness.
- The Graph is a point-in-time snapshot. If it looks stale relative to the product repos, say so and treat its claims as needing confirmation; recommend regenerating it (Bootstrapper/Steward) rather than trusting drift.

## Output artifacts

Always produce:
1. **Test strategy document** — the main deliverable, following the section template.
2. **Clarifying-questions list** — ambiguous, untestable, or missing requirements routed back to the PRD author (lives in §5; the highest-value output).

Produce when they add value or are requested:
3. **Gap-analysis section** — regression candidates + coverage gaps, when a Knowledge Base or test export is available (Appendix B of the template).
4. **Requirements traceability matrix (RTM)** — *only when explicitly asked*, or in regulated/audit contexts that require a defensible trail. It is audit evidence, not a default deliverable; generating it by reflex is a primary reason strategies feel too heavy.

Do **not** produce test cases or Gherkin scenarios — those are deliverables of the later test-plan phase, not the strategy.

## Self-discipline: avoiding the AI-generation traps

This skill is an AI generating a strategy, so it must guard against the well-documented failure modes of AI test generation. The boundary to respect: **AI reliably confirms consistency; only a human confirms correctness.** An AI can tell whether behavior is internally consistent, but it cannot infer the regulatory or financial *correctness* behind a fee calculation, a disclosure, a KYC step, or a cross-border rule. In payments and other regulated domains, that's exactly where the important defects live.

Hold to these rules:
- **Ground everything in the actual PRD.** Vague instructions and missing requirements are the primary cause of hallucinated or wrong test cases. If the basis isn't there, raise it as a clarifying question — don't fabricate the requirement.
- **No vacuous claims.** Never assert "verify payment works correctly" or "check it behaves as expected." Where the strategy names an expected outcome it must be concrete and observable (specific amount, status, ledger entry, error code, message). If you can't state the expected result, you've found a gap — raise it as a clarifying question.
- **Flag where a domain/compliance expert must define "correct."** Mark these explicitly rather than guessing: fee/interest math, rounding and currency rules, regulatory disclosures, KYC/AML steps, settlement and reconciliation logic.
- **Prefer a lean, high-value strategy over volume.** A wall of generic sections and boilerplate is noise — keep the small fraction that is specific, PRD-grounded, and decision-driving (risk priorities, clarifying questions, gap analysis) and cut the rest. Optimize for what stakeholders actually act on.
- **Treat the output as a reviewed draft.** The strategy is a starting point that requires QE review and sign-off before it's authoritative. Say so in the document.

## Handling ambiguity

When a requirement is ambiguous or untestable, **do not silently resolve it**. Add it to the clarifying-questions list, and if you must proceed, state the assumption explicitly in the strategy so the reader can correct it. A strategy built on unstated assumptions is worse than one that flags its own uncertainty.

## Tone and scope

Keep the strategy proportional to the feature. A one-screen feature does not need a twenty-page strategy. Lead with the risk-based priorities and the clarifying questions; those are what stakeholders actually act on.
