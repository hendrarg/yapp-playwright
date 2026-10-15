# k6 baseline — 2026-10-14

Reference numbers for spotting regressions. Target `staging.yapp.ink`, profile `load`
(ramp to 10 VUs, hold 10 min), run from one Windows workstation in Jakarta, one shared
account per scenario. Re-baseline after an infra change, not after every run.

| Scenario | Requests | Fail | RPS | p95 | p99 |
|---|---:|---:|---:|---:|---:|
| buyer/browse | 16,202 | 0% | 20.7 | 294 ms | — |
| creator/dashboard | 19,488 | 0% | 24.8 | 618 ms | — |
| buyer/checkout | smoke only | 0% | — | 355 ms read / 228 ms write | — |
| buyer/comments + creator/follow | smoke only | 0% | — | 128 ms read / 155 ms write | — |

## Slowest endpoints under load (p95 ms, smoke 1 VU → load 10 VUs)

| Endpoint | Smoke p95 | Load med | Load p95 | Load p99 |
|---|---:|---:|---:|---:|
| GET /tier-memberships (creator) | 595 | 734 | 1270 | 2051 |
| GET /shop/products | 203 | 386 | 1184 | 1944 |
| GET /creator/analytics/products | 150 | 261 | 1059 | 1913 |
| GET /dm/conversations (every creator page) | 365 | 312 | 886 | 1632 |
| GET /posts/my/posts | 362 | 269 | 684 | 1179 |
| GET /posts/explore | 482 | 239 | 535 | 860 |

Everything else stays under 600 ms p95 at 10 VUs.

## Web Vitals, guest, real Chromium (`buyer/vitals` smoke, 4 iterations — indicative)

| Page (p75) | TTFB ms | FCP ms | LCP ms | CLS |
|---|---:|---:|---:|---:|
| landing | 308 | 1724 | 2172 | 0.000 |
| explore | 123 | 456 | 2236 | 0.004 |
| creator profile | 297 | 1252 | 1304 | 0.020 |
| product (`/s/<shortUrl>`) | 2306 | 2932 | 3556 | 0.003 |

The product page is the one outside Google's "good" band (LCP < 2.5 s); its TTFB includes the
`/s/<shortUrl>` → `/<creator>/product/<short>` redirect. The aggregate thresholds still pass
because the other pages pull p75 down — read the per-page table, not just the threshold line.

## Known non-load findings (2026-10-14)

- `GET /account/{uuid}/quick-amounts` answers HTTP 500 (body `status: 404`) for creators
  without quick amounts — accepted explicitly in `buyer/browse`.
- Featured creator `testuser123` has a profile that 500s `user not found.` — skipped in setup.
- Creator `/feeds` loads comments once per post (N+1); replayed on purpose.
- `/_next/image` fails for some assets: **400 `Unsupported image format`** when the asset is
  served with no `Content-Type` (valid PNG/JPEG bytes), **403** when the source object answers
  CloudFront `AccessDenied` (e.g. `hendrarg`'s profile photo).
- Sentry ingest answers 429 on dev (quota) — third-party noise in the browser-failure table.

Details: `.agents/knowledge/explore-and-profile.md`, `.agents/knowledge/posts.md`.
