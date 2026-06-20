---
name: fix-tsc-errors
description: Run TypeScript type-checking and fix any reported errors
---

## When to use
Use after making code changes to verify type correctness, or when type errors are reported.

## Steps

1. Run `npx tsc --noEmit` from project root.

2. If there are errors:
   - Read each error location
   - Fix the root cause (missing import, type mismatch, wrong argument, etc.)
   - Do NOT add `any` or `@ts-ignore` unless the constraint is genuinely unresolvable

3. Re-run `npx tsc --noEmit` to confirm all errors are resolved.

## TSConfig notes

- Path aliases are configured: `@pages/*`, `@fixtures/*`, `@utils/*`, `@helpers/*`, `@config/*`
- `ignoreDeprecations: "6.0"` silences TS 6.0 `baseUrl` deprecation
- CommonJS module resolution
