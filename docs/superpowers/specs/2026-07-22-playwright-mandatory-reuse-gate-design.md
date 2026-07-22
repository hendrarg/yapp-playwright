# Playwright Mandatory Reuse Gate

## Objective

Prevent Playwright automation work from creating parallel steps, locators, helpers, test data, or files when an existing implementation can be reused or extended.

## Scope

The gate applies to every Playwright test change in this repository, including mapped `/automation <AUT-ID>` work, maintenance, bug fixes, and flaky-test fixes. Verification also follows a single-pass rule: once the isolated target passes, testing stops.

The implementation changes only these instruction surfaces:

- `.agents/rules/code-style.md` for the always-on rule.
- `.agents/rules/testing.md` for single-pass verification.
- `.agents/skills/add-test-spec/SKILL.md` for the mapped-automation workflow.
- `.agents/skills/resolve-flaky-tests/SKILL.md` to remove mandatory three-run verification.
- `.agents/commands/automation.md` for the command checklist.

No runtime script, duplicate-code linter, or CI job will be added. Semantic reuse requires repository-aware judgment, while automatic similarity checks would introduce false positives.

## Mandatory Reuse Gate

Before editing Playwright code, the agent must:

1. Read the target spec and its page objects.
2. Read every existing AUT explicitly referenced by the user.
3. Search `tests/` and `src/` with `rg` for matching step intent, locator labels, page-object methods, helpers, utilities, fixtures, and test data.
4. Classify each required operation as:
   - **Reuse**: call the existing implementation unchanged.
   - **Extend**: parameterize or minimally extend the existing implementation.
   - **New**: add code only when no suitable implementation exists.
5. Prefer the smallest diff and reuse existing transaction/setup mechanisms unless the requested testcase explicitly requires different behavior.

The agent must not begin editing until this inventory is complete. The inventory remains in the working conversation; it must not create an intermediate repository file.

## New-Code Conditions

A new locator, method, helper, test-data file, page object, or mock is allowed only when repository search finds no suitable implementation to reuse or extend.

When new code is necessary:

- Keep page-specific locators in the existing page object.
- Extend an existing helper before creating a parallel helper.
- Create a new file only when required by repository separation rules or when it has a clear reusable responsibility.
- Do not introduce mocks or fixtures merely to replace an existing working project flow.

## Authority and Conflicts

Explicit user instructions and user-provided reference AUTs are authoritative for implementation intent. Validated Automation Mapping remains authoritative for testcase coverage. If they conflict materially, the agent must report the conflict before implementing rather than silently choosing a new architecture.

## Verification

Before claiming completion, the agent must review the final diff and confirm:

- Every new locator, method, helper, and file has no existing equivalent.
- Existing referenced AUT steps were reused where their behavior matches.
- The diff contains only additions required for the testcase.
- Type-checking and the isolated mapped test pass when code was changed.

Run the isolated target once after the latest code change. A passing run is sufficient evidence and ends verification. If it fails, diagnose and fix it, then run it once again. Do not use `--repeat-each`, repeated confirmation runs, a full spec, or a broader suite unless the user explicitly requests them.

For instruction-only changes, verification consists of reading the final diff and checking that all instruction surfaces contain the same blocking reuse and single-pass rules without contradictory wording.
