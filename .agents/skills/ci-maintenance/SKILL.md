---
name: ci-maintenance
description: Maintain GitHub Actions, CI env wiring, and Playwright CI validation
---

## When to use

Use when changing `.github/workflows/`, CI environment variables, GitHub secrets, Playwright projects, or report artifacts.

## Workflow

1. Read `.agents/rules/ci.md`.
2. Read the workflow file before editing.
3. Preserve secret references as readable `secrets.NAME` expressions.
4. Keep non-secret URLs literal unless the user asks for repo variables.
5. Do not add CI steps that require interactive browser UI.

## Checks

- Confirm required env vars are passed to the test step.
- Confirm optional env vars do not crash tests when unset.
- Confirm artifact upload still runs with `if: ${{ !cancelled() }}`.

## Verification

```bash
npx tsc --noEmit
npx playwright test --project=chromium --list
```

Run full CI locally only when explicitly requested.
