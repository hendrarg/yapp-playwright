---
description: Generate automation from a Google Sheets Automation ID
---

Use this workflow for one ID such as `AUT-E2E-002` or `AUT-FV-013`.

Run this command inline. If `rg -n "@<AUT-ID>" tests` finds no exact tag, first create a short local `docs/automation-plans/<AUT-ID>.md` table with source TC ID, test step, expected result, and reuse target. If the tag exists and this is a small update/edit, create no plan. Never commit the short plan. Do not create long plans, worktrees, or subagents unless an extended workflow condition in `AGENTS.md` is met.

1. Read `.agents/skills/add-test-spec/SKILL.md`.
2. Run `npm run automation:context -- <AUT-ID>`.
3. Stop and report every blocker if context validation fails.
4. Complete the Mandatory Reuse Gate before editing:
   - Read the target spec, page objects, similar specs, and every AUT referenced by the user.
   - Search `tests/` and `src/` with `rg` for reusable steps, locators, methods, helpers, fixtures, mocks, and test data.
   - Classify every required operation as `Reuse`, `Extend`, or `New` in the working conversation.
   - Do not create new code when an existing implementation can be reused or minimally extended.
   - **Fragile locators (CSS/XPath-only) are always `Extend`, never `Reuse` unchanged** — wrap with `smartLocator` when touching that page object.
5. Generate a reviewable Playwright draft. **All new/touched locators must use `smartLocator`.** Meet minimum test depth (see `add-test-spec` Step 5 checklist).
6. Tag generated tests with the exact Automation ID, such as `@AUT-E2E-008`.
7. Run `npx tsc --noEmit`, then run only the generated Automation ID once after the latest change. Stop when it passes; do not use `--repeat-each`, a full spec, or a broader suite unless the user explicitly requests it.
8. Run `npm run audit:tags` when practical. Fix tag gaps before finishing.
9. After the isolated Playwright run for this AUT ID passes, set that Automation Mapping row's **Automation Status** to `Automated`.
   - Allowed from: `Planned` only. Already `Automated`: no-op. `Needs Review` or `Blocked`: stop and report, do not overwrite.
   - Leave Notes unchanged. Do not mark Automated if the run failed, skipped, or was not executed.
   - If more than one row matches the Automation ID, stop and report it; do not guess which row.
   - Use the Google Sheets MCP (`google-sheets` in `.mcp.json` / `opencode.json`) and re-read the status cell to confirm.

```powershell
npx playwright test tests/buyer/feeds.spec.ts --project=chromium --grep @AUT-E2E-008
```
