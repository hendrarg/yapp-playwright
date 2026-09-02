---
title: Wallet
category: project
tags: [yapp, product, automation, wallet]
project: yapp
---

> **Hub:** [[index|Domain knowledge index]] · [[../../yapp|yapp project]]

The creator Wallet: balances, transaction history, and the withdrawal flow.
Established 2026-08-31 while converting the Wallet PRD-gap rows into test cases.

## The three balance surfaces disagree

This is the trap: **do not treat any one surface as the balance.** On the same
account, in the same session, verified stable across two full reloads:

| Surface | IDR | USDT |
|---------|-----|------|
| `Active Balance` card | Rp16.395.197,09 | $922,26 |
| `Your Assets` table, `ACTIVE` column | Rp16.299.197,09 | **no row at all** |
| `Withdraw` dialog with asset USDT | — | `Balance: 0,00USDT` |

The IDR figures differ by exactly **Rp96.000,00**. The `Your Assets` table is
internally consistent (`ACTIVE + PENDING = TOTAL`) and simply has no USDT row, while
the withdrawal dialog reports zero USDT despite the card showing $922,26.

An assertion that reads a balance from one surface and checks it against another will
fail on correct-looking data. Pick the surface the test is actually about and say so.

## Transaction history

Columns are `TYPE`, `AMOUNT`, `STATUS`, `DATE`. **Status renders lower-case**
(`pending`, `settled`) — match case-insensitively.

Pagination has a `Rows` selector (10 / 20 / 30 / 40 / 50, default **10**) plus
`Page X of Y` and first/prev/next/last buttons that disable correctly at the ends.
This is a real difference from the Orders list, which is locked at 10 rows with no
selector — see [[orders-and-reports]].

The type filter reads `All`, `Tips`, `Withdraw`, `Convert`, `Order`, **`Referrer
Fees`** — note "Referrer", not "Referral", which is what the test-case sheet calls it.

## Withdrawal form

`Withdraw` opens a dialog, not a page. It starts with `Asset *` (IDR or USDT) and an
`Amount *`; the rest of the form appears only after an asset is chosen.

For USDT the fields are `Chain *`, `Receiver Wallet Address *`, and `Amount *`.
**Chain offers exactly two options: `Tron` and `Ethereum`.**

**The receiver address is not validated client-side at all.** `abc`, `0x123` and
`!!!!` are all accepted verbatim with no message, and nothing checks the address
against the selected chain. Do not write a test expecting an inline format error.

The USDT amount placeholder reads `Minimum withdrawal 10,00USDT`, while
`TC-WLT-C-028` / `TC-WLT-C-029` state a 100 USDT minimum. One of the two is stale —
confirm before asserting a minimum.

## Withdraw checks the PIN before it checks the balance

On a brand-new creator with `Rp0,00` the `Withdraw` button is **enabled**, and pressing it
opens `Set Up Your PIN to Continue` — "A PIN is required to secure your transactions and
withdrawals. Please create one before proceeding" (Cancel / Set Up Now). No message about
an empty balance appears at all.

So every withdrawal scenario on a fresh account stops at the PIN gate: a PIN must exist
before any amount validation can be reached. Verified 2026-09-02 on account 498.

## A zero-balance wallet is internally consistent

The fresh account shows `Active Balance` and `Pending Balance` at `Rp0,00` / `$0,00`,
`Your Assets` empty, and `History` reading `No results.` with the All / Recent / Pending /
Settled filters and the 10-rows selector still present. Worth contrasting with the
long-lived QA account, whose three balance surfaces disagree — that disagreement needs
transaction history to appear, so it cannot be reproduced on a clean account.

