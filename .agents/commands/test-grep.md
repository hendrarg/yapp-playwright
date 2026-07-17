---
description: Run one mapped automation by Automation ID tag
---

Run one mapping inside a feature spec.

```bash
npx playwright test tests/{domain}/{feature}.spec.ts --project=chromium --grep @<AUT-ID>
```

Example:

```bash
npx playwright test tests/buyer/feeds.spec.ts --project=chromium --grep @AUT-E2E-008
```

For API tests:

```bash
npx playwright test --project=api tests/api/{domain}.{feature}.spec.ts --grep @<AUT-ID>
```
