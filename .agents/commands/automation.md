---
description: Generate automation from a Google Sheets Automation ID
---

Use this workflow for one ID such as `AUT-E2E-002` or `AUT-FV-013`.

Run this command inline. Do not create design/plan documents, worktrees, or subagents, and do not ask for an execution-mode choice unless an extended workflow condition in `AGENTS.md` is met.

1. Read `.agents/skills/add-test-spec/SKILL.md`.
2. Run `npm run automation:context -- <AUT-ID>`.
3. Stop and report every blocker if context validation fails.
4. Complete the Mandatory Reuse Gate before editing:
   - Read the target spec, page objects, similar specs, and every AUT referenced by the user.
   - Search `tests/` and `src/` with `rg` for reusable steps, locators, methods, helpers, fixtures, mocks, and test data.
   - Classify every required operation as `Reuse`, `Extend`, or `New` in the working conversation.
   - Do not create new code when an existing implementation can be reused or minimally extended.
5. Generate a reviewable Playwright draft with source-TC annotations.
6. Tag generated tests with the exact Automation ID, such as `@AUT-E2E-008`.
7. Run `npx tsc --noEmit`, then run only the generated Automation ID once after the latest change. Stop when it passes; do not use `--repeat-each`, a full spec, or a broader suite unless the user explicitly requests it.

```powershell
npx playwright test tests/buyer/feeds.spec.ts --project=chromium --grep @AUT-E2E-008
```
