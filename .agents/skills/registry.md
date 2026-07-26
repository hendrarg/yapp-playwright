# Skill Registry

Use this registry to decide which workflow document to read for a task.

| Skill | Read when |
|-------|-----------|
| `add-page-object` | Adding or registering a new page object |
| `add-test-spec` | Creating automation from a Google Sheets Automation ID |
| `api-seeding` | *(see `add-test-spec` Step 4b)* — API seed/cleanup for pre-created test data |
| `ci-maintenance` | Maintaining GitHub Actions, CI env, secrets, or artifacts |
| `fix-tsc-errors` | Running `tsc --noEmit` and fixing TypeScript errors |
| `generate-locators-mcp` | Generating locators from MCP Playwright browser snapshots during `/automation` |
| `iterative-e2e-testing` | Developing E2E tests in repeated verify/fix rounds |
| `migrate-unmapped-aut` | Assigning `@AUT-*` to unmapped or retired-tag smoke tests |
| `network-mocking` | Mocking payment, email, analytics; composing mocks with `authTest` |
| `resolve-flaky-tests` | Diagnosing and fixing flaky Playwright UI tests |
| `reuse-patterns` | Looking for shared locators, steps, or helpers before adding new code |
| `tag-compliance` | Auditing or fixing required Playwright test tags (`npm run audit:tags`) |

Skill files live at `.agents/skills/{skill}/SKILL.md`.

## Command shortcuts

| Command | Purpose |
|---------|---------|
| `.agents/commands/automation.md` | Generate from `@AUT-ID` |
| `.agents/commands/migrate-unmapped.md` | Assign `@AUT-*` to unmapped tests |
| `.agents/commands/audit-tags.md` | Run tag audit |
| `.agents/commands/audit-locators.md` | Run locator audit |
