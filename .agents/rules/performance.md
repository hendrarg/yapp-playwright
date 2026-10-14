# Performance Test Guidelines (k6)

## Runtime

- k6 scripts in `perf/` run on k6's own runtime, not Node: never import `config/env.ts`,
  `src/**`, `dotenv` or Playwright there. Env arrives through `__ENV`, set by
  `scripts/perf-run.mjs` from `.env`. Type-check with `npm run typecheck:perf`.
- Run scenarios through `npm run perf -- <scenario>`, not raw `k6 run`: the wrapper refuses
  expired tokens, gates heavy profiles, points `k6/browser` at Playwright's Chromium and writes
  the per-endpoint table.
- Every API request goes through `perf/lib/http.ts` (`apiGet`, `apiBatch`, `apiWrite`) so it
  carries the WAF's browser-like headers and a stable `name` tag. Templated URLs get one name
  (`GET /products/{uuid}`), never the raw URL.

## Load etiquette

- The target (`staging.yapp.ink`) is shared with E2E and manual QA. `smoke` is the only profile
  that may run unannounced; `load`/`stress`/`spike`/`soak` need a slot agreed with BE/DevOps
  and `--confirm`. Never schedule a heavy profile in CI.
- Do not run `buyer-checkout` or `social-write` alongside E2E: they share the QA buyer's cart
  and the test accounts' follow/comment state.

## Side effects

- Read scenarios replay what the page fires on load (capture it from the browser, do not
  guess endpoints) but drop writes such as `POST /view/counter/{uuid}`.
- Writes stay inside the three test accounts, never real creators. Anything a write creates is
  removed in `teardown()`, and any state it flips is restored to what `setup()` recorded.
- Never call `POST /orders/quote` or anything that pays; `quote/estimation` is the checkout limit.
- Writes that cannot be undone for both sides (DMs: delete is `scope: 'me'` only) stay out.
- Discover IDs in `setup()`; nothing is hardcoded, because dev data churns.

## Known server quirks

- When the app answers a normal empty state with a 500 (`quick amount not found`), accept that
  exact body via `apiBatch`'s `known500` — never widen `expect` to all 500s.
- Exclude broken fixtures in `setup()` with a `console.warn` instead of letting them fail checks.
- Record new product facts in `.agents/knowledge/` and refresh `perf/baseline.md` only after an
  agreed `load` run.
