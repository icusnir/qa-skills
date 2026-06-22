# Xray Cucumber CSV — Format

The test cases are emitted as an Xray-importable Cucumber CSV (the canonical, reviewable artifact and the Xray UI Test Case Importer path). The import script consumes the same CSV.

## Column order (exact)
```
Test Type, Test Summary, Description, Scenario, Labels, Test Repository Path, Issue Links - Tests
```

## Rules per column
| Column | Rule |
|--------|------|
| **Test Type** | `Cucumber` |
| **Test Summary** | `E2E \| <Domain> \| {P0\|P1\|P2\|P3} \| {Flow Theme} \| {Scenario Title}` — e.g. `E2E \| Payments \| P0 \| One-time Payment \| New One-Time Payment Flow – Manual Card Entry` |
| **Description** | Short reference to the source: strategy risk item / UAT flow / PRD AC (e.g. `UAT Flow 1; PRD F-12,F-19` or `Strategy R-7 (Stripe PM validation)`) + a one-line priority rationale |
| **Scenario** | Full Gherkin body in a single cell. Start with `Scenario:` (or `Scenario Outline:` + `Examples:`), steps separated by `\n`. **Include the Gherkin tag line(s)** above `Scenario:` — feature backbone + scenario flags + `@UAT` where applicable |
| **Labels** | Jira labels, `;`-delimited — e.g. `Payments;QE;PaymentSchedules;UAT`. (Distinct from Gherkin tags, which live in the Scenario cell.) |
| **Test Repository Path** | `<Domain>/{Initiative}` (e.g. `Payments/Payment Schedules`), optionally a sub-folder per flow theme (`Payments/Payment Schedules/Cancel`) |
| **Issue Links - Tests** | The feature-initiative requirement/epic/story key this test covers (the initiative ticket — **not** the regression plan key) |

## CSV file requirements
- UTF-8, comma delimiter, **`QUOTE_ALL`** (every field wrapped in double quotes).
- Internal double quotes escaped as `""`.
- Multi-line Gherkin preserved inside the single quoted `Scenario` cell.
- Filename: `{initiative}_xray_cucumber_tests.csv` (e.g. `payment_schedules_xray_cucumber_tests.csv`).

## Xray importer field mapping (UI fallback)
| CSV field | Xray Test Case Importer field |
|-----------|-------------------------------|
| Test Type | Test Type |
| Test Summary | Summary |
| Description | Description |
| Scenario | Gherkin Definition |
| Labels | Labels |
| Test Repository Path | Test Repository Path *(only if column present)* |
| Issue Links - Tests | Link Test "tests" (outward) |

> On the Xray Setup screen: **List value delimiter = `;`**, enable **"Create Test Repository folders if needed"**, target your project, and import **into the Test Plan** created for the initiative.

## Discipline
- **Minimum scenarios** to cover the strategy's prioritized items + all UAT flows + PRD ACs in scope — combine related ACs into one scenario where it reduces redundancy without losing coverage. Each scenario stays **atomic (one user flow)**.
- **No vacuous steps / no mock values** as expected results — concrete, observable outcomes grounded in PRD/UAT/API.
- Append a **coverage-map table** (scenario → source) alongside the CSV.
