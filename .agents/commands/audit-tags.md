---
description: Audit Playwright tests for missing TC tags
---

Find test tag declarations that do not include an `@T...` TC tag.

```bash
rg -P "tag: \[(?![^\]]*'@T)" tests
```

No output means the TC tag audit is clean.
