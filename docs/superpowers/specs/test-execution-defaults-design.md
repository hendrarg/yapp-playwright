# Test Execution Defaults Design

## Goal

Make local and CI Playwright execution predictable, stable, and consistent with the repository's E2E-only test surface.

## Chosen Approach

Use browser projects only. Remove stale standalone API-test guidance while retaining `src/helpers/api/` for setup, cleanup, webhook, and seed operations used by browser tests.

Alternatives rejected:

- Restoring an `api` Playwright project would recreate a test surface that the repository already removed and currently does not use.
- Leaving stale API commands and skills would keep producing invalid commands and generated files.

## Execution Lanes

| Lane | Command behavior | Browser | Workers | Retry |
|------|------------------|---------|---------|-------|
| Local default | all browser tests | Chromium | 1 | 0 |
| Local smoke | `@smoke` | Chromium | 1 | 0 |
| Local regression | `@regression` | Chromium | 1 | 0 |
| Cross-browser regression | `@regression` | Chromium, Firefox, WebKit | 1 | 0 locally, 1 in CI |
| CI push/pull request | `@smoke` | Chromium | 1 | 1 |
| CI scheduled | `@regression` | Chromium, Firefox, WebKit | 1 | 1 |

The default worker count is one because the suite shares authentication and mutable application state. `PW_WORKERS` remains an explicit override.

## Playwright Configuration

- Load `.env` before reading `PW_HEADLESS`, `PLAYWRIGHT_HEADLESS`, or `PW_WORKERS`.
- Run headless whenever `CI` is set; otherwise honor the local headless environment override.
- Default workers to one in every environment.
- Retry once in CI and never retry locally.
- Keep Chromium, Firefox, and WebKit projects; package scripts decide when cross-browser execution is intentional.
- Keep HTML reporting and first-retry traces.

## Package Scripts

- `npm test`: Chromium only.
- `npm run test:smoke`: Chromium `@smoke`.
- `npm run test:regression`: Chromium `@regression`.
- `npm run test:cross-browser`: `@regression` across all configured browser projects.
- Keep automation-context scripts unchanged.

## CI

- Push and pull requests install Chromium and run the smoke lane.
- The scheduled workflow installs all Playwright browsers and runs cross-browser regression.
- Required URLs and secrets remain unchanged.
- Report upload remains enabled on non-cancelled runs.
- Job timeout remains 60 minutes.

## Standalone API Cleanup

Remove active references to:

- the nonexistent `api` Playwright project;
- `tests/api/`;
- the deleted `api.fixtures` fixture;
- standalone API automation generation;
- standalone API commands and the `api-testing` skill.

Keep `src/helpers/api/` and its current browser-test consumers. Historical Superpowers plans remain unchanged.

## Verification

Configuration files use command-level red/green checks instead of adding a new test framework or config-test abstraction:

- Before implementation, prove the current default lists three browsers and the nonexistent API project fails.
- After implementation, run `npm test -- --list` and confirm Chromium-only discovery.
- Run the smoke, regression, and cross-browser scripts with `--list`.
- Run `CI=true` configuration discovery to confirm CI settings load.
- Run `npx tsc --noEmit`.
- Audit active files for stale `--project=api`, `tests/api`, and `api.fixtures` references.
- Confirm `src/helpers/api/` consumers remain intact.

No full browser execution is required for this configuration-only change.
