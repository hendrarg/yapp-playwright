# Remove Local Test Cases Design

## Goal

Remove the obsolete local Markdown test-case workflow so Google Sheets Automation Mapping is the only source used to generate new automation.

## Scope

- Delete the local `test-cases/` directory and all Markdown files under it.
- Delete the `/tc` command.
- Remove the Local Markdown workflow from the `add-test-spec` skill.
- Update active repository guidance so new automation starts from `/automation <AUT-ID>` and Google Sheets.
- Remove the `test-cases/` Git ignore entry because the directory will no longer be used.
- Keep historical Superpowers plans unchanged as records of earlier decisions.

## Active Test Safety

Deleting the Markdown source must not delete or weaken existing Playwright tests.

Sixteen active auth and creator tests still use `@TAT-A-*` or `@TAT-C-*` tags. They remain unchanged because there is no validated Automation Mapping ID for them yet. Their tag migration is separate work that requires adding or confirming matching rows in Automation Mapping first. Active guidance will describe these tags as legacy identifiers only, not as supported inputs for generating tests from local Markdown.

## Resulting Workflow

```text
/automation <AUT-ID>
  -> read Automation Mapping
  -> read the referenced active manual TC sheets
  -> build validated automation context
  -> update Playwright spec, page object, and test data as needed
  -> run the mapped test with --grep @<AUT-ID>
```

No intermediate Markdown document is created.

## Files to Change

- Delete `test-cases/`.
- Delete `.agents/commands/tc.md`.
- Update `AGENTS.md` to remove the local directory and `/tc` workflow.
- Update `.agents/skills/add-test-spec/SKILL.md` to support Automation Mapping only.
- Update `.agents/skills/registry.md` to describe the Sheets-only input.
- Update `.agents/skills/tag-compliance/SKILL.md` to remove local-document assumptions while allowing existing non-buyer legacy tags until mapped.
- Update `.agents/rules/testing.md` to describe `@TAT-A-*` and `@TAT-C-*` as legacy-only tags.
- Update `.agents/rules/git-hygiene.md` to remove the obsolete local-directory exception.
- Update `.gitignore` to remove `/test-cases/`.

## Verification

- Confirm `test-cases/` and `.agents/commands/tc.md` no longer exist.
- Confirm active instructions contain no `/tc` command or local Markdown generation workflow.
- Confirm historical references exist only under `docs/superpowers/plans/`.
- Run `npx tsc --noEmit`.
- Run `npx playwright test --list` to confirm all specs still load and active tests remain discoverable.

## Out of Scope

- Deleting existing Playwright tests.
- Inventing Automation Mapping IDs for auth or creator tests.
- Editing historical plan documents.
- Changing Google Sheets data.
