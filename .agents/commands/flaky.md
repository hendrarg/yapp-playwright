---
description: Re-run a flaky test with trace
---

Run a flaky spec three times with trace enabled.

```bash
npx playwright test --repeat-each=3 --trace=on <spec>
```

Do not use `--repeat-each` for reCAPTCHA tests such as `tests/auth/otp-login.spec.ts`.
