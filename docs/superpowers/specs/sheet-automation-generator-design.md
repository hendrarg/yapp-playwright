# Sheet Automation Generator

## Goal

Generate a reviewable Playwright draft from one `Automation ID` without creating intermediate Markdown test-case files.

## Entry Point

Extend the existing repository automation workflow with:

```text
/automation AUT-E2E-002
```

The command accepts exactly one `AUT-E2E-*` or `AUT-FV-*` ID per run.

## Data Flow

1. Read the requested row from the `Automation Mapping` sheet.
2. Read every manual-test sheet and build a global index keyed by `Test Case ID`.
3. Resolve every value in `Covered TC IDs` through that index, regardless of the primary source sheet named by the mapping row.
4. Validate that every ID exists exactly once, `TC Count` matches, and no `GAP` case is included.
5. Produce an in-memory structured context containing the mapping row and resolved source cases.
6. Stop with a clarification report when required source data is missing or ambiguous.
7. Otherwise hand the context to the existing `add-test-spec` workflow to generate a Playwright draft, review existing helpers/page objects, type-check, and run only the generated automation.

No Markdown test-case file, selector registry, service, database, or new runtime dependency is introduced.

## Sheet Contract

Manual-test sheets use these columns:

```text
Test Case ID
Epic
Feature
Test Case Title
Preconditions
Steps
Expected Result
notes Web
```

The mapping sheet provides:

```text
Automation ID
Layer
Domain / Source Sheet
Role
Automation Scenario
Covered TC IDs
TC Count
Priority
Preconditions / Test Data
Automation Flow / Validation
Expected Outcome
Run Scope
Automation Status
Notes
```

The spreadsheet ID and mapping-sheet GID are configured through environment variables so secrets and deployment-specific URLs are not committed.

### Retired Sources

- `Buyer AT` and `TC Buyer Old` are retired and may be hidden or deleted.
- The generator and maintenance workflow must not read or depend on either retired sheet.
- Coverage is determined only from `Automation Mapping`, its active source TC sheets, and the current Playwright implementation.
- `Automated` means a current Playwright implementation exists for the Automation ID. Do not use a separate `Partially Automated` status.
- Record any remaining mapped behavior in Notes without changing the status back from `Automated`.
- Mapping notes must reference active TC IDs or current test files, not legacy `AT-B-*` IDs.

## Clarification Gate

The generator reports, but does not guess, when it encounters:

- a missing or duplicate TC ID;
- an empty or non-observable expected result;
- a step that does not identify a unique action or state;
- unavailable test data or preconditions;
- multiple matching web elements after existing page objects and the live DOM are inspected.

Each report includes the Automation ID, TC ID, source sheet and row, original step, expected result, observed state, and evidence path. Human decisions are recorded in the existing `Automation Clarifications` sheet. The source manual TC remains the source of truth and is updated when the TC is outdated.

## Generation Rules

### Automation Tags

- `Automation ID` from `Automation Mapping` is the Playwright test tag source of truth.
- Use the exact mapping ID as the tag, for example `@AUT-E2E-008` or `@AUT-FV-216`.
- Replace legacy `@TAT-B-*` tags in existing buyer automation; do not keep dual tags.
- Apply the mapping tag whenever a current implementation exists so `--grep @AUT-*` runs every available test for that mapping.
- One test may have multiple `@AUT-*` tags, and one mapping tag may appear on multiple tests, because current code coverage and the new mapping are many-to-many.
- Keep feature, role, priority, and optional status/domain tags unchanged.
- Keep covered manual TC IDs in Playwright annotations rather than adding one tag per manual TC.

Example:

```typescript
tag: ['@AUT-FV-216', '@AUT-FV-246', '@feeds', '@like', '@buyer', '@regression']
```

Filtering uses the exact mapping ID:

```text
npx playwright test --grep @AUT-FV-216
```

### E2E Journey

- Generate one journey test per Automation ID.
- Use API helpers for setup when they already exist.
- Use the browser for behavior and assertions that the journey is intended to validate.
- Attach source TC IDs through Playwright annotations.

### Functional Validation

- Generate one `test.describe` group per Automation ID.
- Keep independently failing manual cases as separate tests.
- Parameterize only cases that share the same flow and differ only in input or expected data.

Locators remain in page objects and follow the repository selector priority. Ambiguous matches must not be hidden with `.first()`.

## Verification

The draft is ready for human review only after:

1. mapping and source-case validation passes;
2. no open clarification blocks the Automation ID;
3. `npx tsc --noEmit` passes;
4. only the generated Automation Mapping tag is run with Playwright;
5. the generated diff and Playwright trace/evidence are available for review.

## Initial Scope

Implement and verify the workflow with one existing E2E golden sample and one functional-validation mapping containing two to four source cases. Batch generation, a dashboard, a custom DSL, and automatic mass updates are out of scope.
