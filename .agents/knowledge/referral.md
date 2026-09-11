---
title: Referral programme
type: note
category: project
tags: [yapp, product, automation, referral]
project: yapp
created: 2026-09-09
updated: 2026-09-09
sources: 0
status: active
---

> **Obsidian:** [[projects/yapp/knowledge/index|Knowledge index]]

# Referral programme

The creator-side referral page at `/referral`, its two tabs, and how a shared link
behaves for a guest. Established 2026-09-09 on dev with an account that has never
referred anyone and has no referrer of its own.

## The two sides pay differently

| Tab | Who it is for | What it promises |
|---|---|---|
| `My Referral` | the inviter | **1% commission** when the people you bring transact, explained in three steps: *Share your link* → *Your friend sign up* → *Start earning* |
| `Referred By` | the person using a code | **10% off your payout** — `Get 10% OFF Your Payout with a Referral!` |

The code is **six uppercase alphanumerics** (`VDVWLX`) and the shared link is
`creators.yapp.ink/auth?c={code}`, each with its own `Copy` / `Share` button. Codes live
on `users.referral_code`; `users.referrer_id` and `users.apply_referral_code_at` record
the other direction.

**When the benefit is actually paid is not stated anywhere** — neither tab gives a cycle,
a threshold, or a payout date.

## The link only works on the creator domain

Opening `creators-dev.yapp.ink/auth?c=VDVWLX` in a guest session lands on the sign-up
page and **sets a cookie `rc=VDVWLX`** on that host — that is the whole attribution
mechanism visible to the client.

The **buyer app ignores the parameter**: `yapp-dev.yapp.ink/auth?c=VDVWLX` sets no `rc`
cookie, and a signup completed there produces `users.referrer_id = NULL`. So a referral
can only be earned through the creator domain, which currently cannot finish an OTP
sign-up at all (see `H-12` and [[onboarding|Onboarding]]) — no attributed referral can be
produced on dev today.

## Apply Referral validates live against the server

Rewritten 2026-09-09; an earlier note claimed the button was permanently dead.

The field is `#referral-code`, placeholder `Enter Referral Code`, **no `maxlength`**, and
it stores whatever is typed — lowercase, leading/trailing spaces, special characters.
Validation happens as you type:

- an **existing, uppercase** code (`FMTZMK`, `RBUKLD`) → no message and **`Apply Referral`
  becomes enabled**;
- a code that does not exist (`ZZZZZZ`, `ABC123`), a 12-character string, or the right
  code in **lowercase** (`fmtzmk`) → inline `Invalid referral code`, button stays disabled.

So codes are **case-sensitive**, and the button is a reliable signal of server-side
validity. **Your own code is accepted too** — typing the account's own `VDVWLX` enables
the button, so self-referral is not blocked client-side (`M-71`).

## An empty Referral List still says "Page 1 of 0"

`My Referral` renders the table with columns `USER`, `DATE JOINED`, `COMMISSION IDR`,
`COMMISSION USDT`. With no referrals the empty state is **a row inside the table**
(`You're so close to earning` / `Get started today!` plus an illustration), the `Rows`
selector reads 10, the page indicator reads **`Page 1 of 0`**, and all four pagination
buttons are disabled — the same off-by-one page label already recorded for Orders.
