---
description: Assign @AUT-* tags and business flows to unmapped smoke tests
---

Use when specs lack `@AUT-E2E-*` / `@AUT-FV-*` tags.

1. Read `.agents/skills/migrate-unmapped-aut/SKILL.md`.
2. Find affected tests:
   ```bash
   npm run audit:tags
   ```
3. Run `npm run automation:context -- <AUT-ID>` for the target mapping.
4. Follow `add-test-spec` to replace smoke-only tests with full business flows.
5. Verify:
   ```bash
   npx tsc --noEmit
   npx playwright test tests/{domain}/{feature}.spec.ts --project=chromium --grep @<AUT-ID>
   npm run audit:tags
   ```

Do not assign `@AUT-*` without a validated mapping row.
