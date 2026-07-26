---
name: tag-compliance
description: Audit and fix Playwright test tags so every test has AUT, feature, role, and priority tags
---

## When to use

Use when adding tests, reviewing test metadata, or fixing missing tags.

## Rules

Every test must include:

- an exact Automation Mapping tag: `@AUT-E2E-*` or `@AUT-FV-*` from Google Sheets
- one feature tag such as `@feeds`
- one role tag: `@buyer` or `@creator`
- one priority tag: `@smoke`, `@regression`, or `@sanity`

API tests should also include `@api`.

## Audit

Run the tag audit script:

```bash
npm run audit:tags
```

Or manually find tests missing an `@AUT-*` tag:

```bash
rg -P "tag: \[(?![^\]]*'@AUT-(E2E|FV)-)" tests
```

## Fix Workflow

1. Read the affected spec and nearby tests.
2. Match the test to an existing Automation Mapping row via `npm run automation:context -- <AUT-ID>`.
3. If no active mapping exists, stop and report the unmapped test — do not invent an ID.
4. Re-run `npm run audit:tags` until clean.

## Verification

```bash
npm run audit:tags
npx tsc --noEmit
npx playwright test --list
```
