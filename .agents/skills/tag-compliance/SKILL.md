---
name: tag-compliance
description: Audit and fix Playwright test tags so every test has TC, feature, role, and priority tags
---

## When to use

Use when adding tests, reviewing test metadata, or fixing missing tags.

## Rules

Every test must include:

- `@T<TC-ID>` such as `@TAT-B-E2E-001`
- one feature tag such as `@feeds`
- one role tag: `@buyer` or `@creator`
- one priority tag: `@smoke`, `@regression`, or `@sanity`

API tests should also include `@api`.

## Audit

Find tests whose tag list does not include a TC tag:

```bash
rg -P "tag: \[(?![^\]]*'@T)" tests
```

Find direct Playwright imports in specs:

```bash
rg "from ['\"]@playwright/test['\"]" tests
```

## Fix Workflow

1. Read the affected spec and nearby tests.
2. Match the test to an existing local test case document when possible.
3. If no document exists and the user wants tag-only cleanup, use a grouped smoke/API TC tag only when the behavior is clearly a grouped smoke/API check.
4. Do not create or force-add files under `test-cases/`; the directory is local-only and gitignored.
5. Re-run the audit command until it returns no missing TC-tag matches.

## Verification

```bash
rg -P "tag: \[(?![^\]]*'@T)" tests
npx tsc --noEmit
npx playwright test --list
```
