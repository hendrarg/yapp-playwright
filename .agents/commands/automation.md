---
description: Generate automation from a Google Sheets Automation ID
---

Use this workflow for one ID such as `AUT-E2E-002` or `AUT-FV-013`.

1. Read `.agents/skills/add-test-spec/SKILL.md`.
2. Run `npm run automation:context -- <AUT-ID>`.
3. Stop and report every blocker if context validation fails.
4. Reuse existing page objects, helpers, and test data before adding code.
5. Generate a reviewable Playwright draft with source-TC annotations.
6. Run `npx tsc --noEmit` and only the generated automation or source-TC tags.
