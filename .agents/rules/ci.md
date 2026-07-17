# CI Guidelines

## Workflow Scope

- GitHub Actions workflow lives at `.github/workflows/playwright.yml`.
- Keep workflow YAML readable; do not use dynamic secret lookups just to silence editor warnings.
- VS Code Problems from unknown `secrets.*` are editor diagnostics unless GitHub Actions itself fails.

## Required CI Environment

The Playwright workflow must provide:

- `YAPP_BASE_URL`
- `YAPP_CREATORS_BASE_URL`
- `YAPP_API_BASE_URL`
- `YAPP_TEST_ACCESS_TOKEN`
- `TESTMAIL_API_KEY`
- `TESTMAIL_NAMESPACE`

`YAPP_TEST_ACCESS_TOKEN_2` is optional and only needed to seed creator posts for E2E tests.

## Secrets

- Use GitHub repository secrets for tokens and API keys.
- Do not hardcode secret values in workflow files.
- URL values may be literal defaults if they are not secret.

## Validation

- For config-only workflow edits, run `npx playwright test --project=chromium --list`.
- For TypeScript-impacting CI changes, also run `npx tsc --noEmit`.
- Do not run full E2E in CI-maintenance work unless explicitly requested.
