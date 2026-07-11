---
description: Run one test case by TC tag
---

Run a single TC inside a feature spec.

```bash
npx playwright test tests/{domain}/{feature}.spec.ts --project=chromium --grep @T<TC-ID>
```

Example:

```bash
npx playwright test tests/buyer/feeds.spec.ts --project=chromium --grep @TAT-B-E2E-001
```

For API tests:

```bash
npx playwright test --project=api tests/api/{domain}.{feature}.spec.ts --grep @T<TC-ID>
```
