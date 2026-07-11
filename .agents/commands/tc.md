---
description: Generate automation from a test case ID
---

Use this workflow when given a TC ID such as `AT-B-E2E-001`.

1. Read `.agents/skills/add-test-spec/SKILL.md`.
2. Find the matching local test case document under `test-cases/`.
3. Generate or append the automation in the feature spec.
4. Run only the generated TC by tag.

```bash
npx playwright test tests/{domain}/{feature}.spec.ts --project=chromium --grep @T<TC-ID>
```
