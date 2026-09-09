---
title: Wallet
category: project
tags: [yapp, product, automation, wallet]
project: yapp
type: note
created: 2026-09-04
updated: 2026-09-09
sources: 0
status: active
---

> [[projects/yapp/knowledge/index|Knowledge index]]

# Wallet

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

**There is a fourth surface, and it sides with the table.** Re-verified 2026-09-09 (the
figures had moved but the shape held: card `Rp16.963.243,09` / `$961,33`, table ACTIVE
`Rp16.867.243,09`, still the same Rp96.000,00 gap): the Withdraw dialog with asset **IDR**
shows `Balance: Rp16.867.243,09` — the `Your Assets` ACTIVE figure, not the card's. So the
`Active Balance` card stands alone against the other three.

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

The USDT amount placeholder reads `Minimum withdrawal 10,00USDT` — that placeholder is
the only figure the UI puts on screen. Confirm the minimum the server actually enforces
before asserting one, and do not carry a number over from another surface.

## The withdrawal PIN: a 3-stage wizard, and every failure is silent

Established 2026-09-09 running the Wallet PIN test cases. `Set Up Now` opens a wizard,
not a single form:

1. `Step 1 of 2` — `Enter a 6-digit number` (one OTP-style input, `maxlength=6`,
   `inputmode=numeric`), `Next` disabled until six digits are in.
2. `Step 2 of 2` — `Confirm your 6-digit number`. A mismatch answers with the exact
   message **`PINs do not match. Please try again.`** and keeps you on step 2.
3. An email OTP dialog — `Please enter the OTP sent to <account email>`. The code lands
   in `otp_codes` under the purpose **`verify-set-pin`**, a third value beyond the two
   `db-otp.ts` used to know about. It auto-submits on the last digit.

**Only the mismatch talks.** Everything else fails silently:

- Invalid PIN input is filtered rather than reported — letters never reach the field
  (`abcdef` leaves it empty, `12a45b` becomes `1245`) and short input just leaves `Next`
  disabled. No message anywhere.
- **Success is silent too.** After the OTP the dialog jumps straight to the Withdraw
  form — no toast, no confirmation, no success text (checked at 1.5s and 6s). The only
  proof the PIN was created is `users.pin` in the database.

## A wrong PIN answers HTTP 500 and the UI says nothing

`POST /api/v1/accounts/financial-info` is where the PIN is checked, and it returns
validation failures as **500**, which the frontend then swallows whole:

| Input | Response | What the user sees |
|---|---|---|
| wrong PIN | `500 {"status":500,"message":"Invalid PIN"}` | nothing at all |
| correct PIN, made-up account number | `500 {"status":500,"message":"Invalid Bank Account. accountNumber is invalid"}` | nothing at all |
| 4th attempt in a row | `429 Too Many Requests` | nothing at all |

Two consequences for testing. First, the order is **PIN first, bank number second** — so
the message identifies which one failed, and the network tab is the only way to read it.
Second, **there is no remaining-attempt counter** anywhere: not in the UI, not in the
response body. Any test expecting one, or expecting an inline error, fails today.

## A bank destination cannot be created on dev

Verified 2026-09-09 across two accounts and three account numbers (`1234567890`,
`0611101146`, `8720237267`) on `BANK CENTRAL ASIA` with a known-correct PIN: every one is
rejected with `Invalid Bank Account. accountNumber is invalid`. The endpoint appears to
validate against a real disbursement provider, so invented numbers cannot pass and **no
withdrawal test that needs a destination is reachable on dev** without a genuinely valid
Indonesian account number.

This blocks more than the destination cases: the withdrawal form validates **destination
before amount**, so entering an amount and pressing `Withdraw` answers
`Destination is required` and the minimum-amount and over-balance rules never evaluate.
The IDR amount field does state the floor in its placeholder —
`Minimum withdrawal Rp150.000,00`.

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

