---
name: standard-commit-message
description: Use when the user asks to create, review, standardize, or improve git commit messages, including phrases like "commit message", "pesan commit", "standard commit", "buat commit", "commit apa", or when summarizing staged/working-tree changes into a conventional commit. Prefer this skill whenever a commit message is needed, even if the user asks casually.
---

# Standard Commit Message

Use this skill to turn repository changes into a clean, consistent commit message.

The goal is to make commit history easy to scan: one short subject that says what changed and why, with an optional body only when context matters. Keep it useful for humans reviewing history later, not just syntactically valid.

## Workflow

1. Inspect the change scope before writing the message.
   - Prefer `git status --short` for the file list.
   - Use `git diff --stat` for a quick size overview.
   - Use `git diff --cached --stat` and `git diff --cached` when the user asks for a staged commit message.
   - Use `git diff -- <files>` when only specific files are in scope.

2. Identify the primary intent.
   - If changes mix unrelated intents, tell the user the commit should be split and propose separate messages.
   - If changes are related but touch several files, write one message around the user-facing or test-facing outcome.

3. Write a Conventional Commit subject:

   ```text
   type(scope): summary
   ```

   Keep the subject imperative, lowercase after the colon, and ideally under 72 characters.

4. Add a body only when it clarifies important context, risk, migration notes, or validation.

5. If validation was run and the user wants a full commit note, include a short `Validation:` section in the body.

## Types

Choose the first type that fits the real intent:

| Type | Use for |
| --- | --- |
| `feat` | New behavior, new automation coverage, new helper capability |
| `fix` | Bug fix, flaky-test fix, incorrect assertion/locator/API behavior |
| `test` | Test-only additions or changes that do not add product behavior |
| `refactor` | Internal restructuring with no behavior change |
| `chore` | Maintenance, tooling, config, dependency or housekeeping |
| `docs` | Documentation-only changes |
| `ci` | GitHub Actions or CI pipeline changes |
| `build` | Build system, package, or dependency wiring |
| `perf` | Performance improvement |
| `revert` | Reverting a previous commit |

For this Playwright automation repo, prefer:

- `test(...)` for AUT testcase additions and page-object/test helper changes that only support automation.
- `fix(...)` for correcting a broken/flaky existing test or locator.
- `chore(...)` for agent skill, script, or non-test maintenance.

## Scopes

Use a short scope when it helps scanning. Good scopes in this repo:

- `products`
- `promotions`
- `orders`
- `profile`
- `creator`
- `buyer`
- `api`
- `fixtures`
- `skills`
- `ci`

If no clear scope exists, omit it:

```text
chore: clean up unused automation artifacts
```

## Output formats

When the user asks for just the commit message, output only a fenced commit block:

```text
test(products): add AUT-FV-211 inactive status transition
```

When useful, provide 2-3 options:

```text
Option 1:
test(products): add AUT-FV-211 inactive status transition

Option 2:
test(products): cover product status grouping and inactive transition
```

When the user asks for a full commit message with body:

```text
test(products): add product status automation

- cover AUT-FV-210 status grouping across Active, Inactive, and Draft
- cover AUT-FV-211 Set Inactive flow using API seeded product cleanup
- add API status assertion for product transition verification

Validation:
- npx tsc --noEmit
- npx playwright test tests/creator/products.spec.ts --project=chromium --grep "Verify Products Status Grouping"
- npx playwright test tests/creator/products.spec.ts --project=chromium --grep "Set Active Product Inactive"
```

## Style rules

- Be specific, but not noisy.
- Do not include ticket IDs unless they are present in the changes or explicitly requested.
- Do not mention implementation minutiae unless that is the main change.
- Do not claim tests passed unless there is evidence in the conversation or command output.
- Do not include secrets, tokens, local absolute paths, or environment-specific noise.
- Avoid vague summaries like `update tests`, `fix bug`, or `changes`.

## Examples

Input: Added AUT-FV-210 and AUT-FV-211 product automation.

Output:

```text
test(products): add status grouping and inactive transition coverage
```

Input: Fixed Set Inactive by clicking the switch instead of the menu label.

Output:

```text
fix(products): toggle set inactive switch in product actions
```

Input: Added this commit-message skill.

Output:

```text
chore(skills): add standard commit message workflow
```
