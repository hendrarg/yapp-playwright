---
title: Domain Knowledge Index
category: project
tags: [yapp, product, automation]
project: yapp
---

# Domain Knowledge

> **Canonical location:** this Obsidian vault folder (`D:/Knowledge/projects/yapp/domain-knowledge/`).
> The yapp repo exposes the same files via a directory junction at `D:/yapp/.agents/domain-knowledge/`.
> Edit here in Obsidian or via the repo path — both update one file.

**Hub:** [[../../home|Vault home]] · [[../yapp|yapp project]] · [[../../wiki/entities/yapp|wiki entity]] · [[../../raw/sources/yapp/README|repo README (raw source)]]

How the **Yapp product actually behaves** — the business rules, defaults, limits, and
lifecycles you cannot derive from this repository's code, one file per feature area.

Each note exists because an earlier session assumed the obvious behaviour, wrote a
test around it, and was wrong. Read the file for the feature you are touching before
scoping a test case or opening the browser.

## Scope

This folder holds **product behaviour only**. It is deliberately not a rules
directory and not a technique directory:

| Question | Where it is answered |
|----------|----------------------|
| What does the app do? | here |
| How do I write code in this repo? | `.agents/rules/code-style.md`, `.agents/rules/testing.md` |
| How do I drive the app in a browser? | `.agents/rules/mcp-playwright.md` |
| What is the workflow for this task? | `.agents/skills/` |

Authority: these notes describe observed behaviour and rank **below** `AGENTS.md` and
`.agents/rules/`. Where a note contradicts Automation Mapping or a source TC sheet,
the sheet wins.

## Feature areas

| Note | Covers |
|------|--------|
| [[products\|Products]] | Pricing defaults and the Rp10.000 floor, thumbnail capacity and rejection, the status lifecycle, Online Course after-sales |
| [[posts\|Posts]] | Post visibility tiers, pay-per-view pricing and where it is (and is not) enforced |
| [[messaging\|Messaging]] | Chat and Broadcast, the 3-value access policy, attachment cards, mark badges, buyer inbox limits |
| [[tipping\|Tipping]] | Tip button configuration, the fee split, the buyer tip form and its Livestream add-ons |
| [[livestream\|Livestream]] | The `/streamer` app map, overlay URLs, media-share pricing, the shared Save and its Voting trap |
| [[purchase-and-payment\|Purchase & payment]] | Guest purchase OTP and ownership, promo redemption without paying, dev QRIS auto-settlement |
| [[membership\|Membership]] | Discord and Telegram membership, expiry-anchored renewal reminders, the aggregate bot status, Lifetime gaps |
| [[orders-and-reports\|Orders & reports]] | The Orders list, the CSV export and its separate range state, where promo attribution lives, figures verified exact |
| [[explore-and-profile\|Explore & profile]] | Explore feeds and the curated Popular section, dead account fields, landing CTA structure, profile tab order |

## Maintaining these notes

The trigger is concrete: **the browser or the API contradicted an assumption you
started with, or you had to establish a product fact that is not recorded here.**
Either one means you write it into the matching feature file **before you stop** —
not at the end of the sprint, not next session. Typical shapes are a default state, a
validation boundary, a lifecycle rule, and an endpoint that contradicts the UI. State
**why** it is true, and date anything that could change.

Only create a new file for a feature area none of the above covers, and add it to the
table.

**Do not record here:**

- **Test-case status** — Passed / Failed / Blocked / Not Run, retest results, which IDs
  a run closed, which defect was withdrawn. That is sheet state, it changes every run,
  and Automation Mapping plus the source TC sheets are its only home.
- **Progress and changelogs** — what was done this session, what is still outstanding,
  which blocker was lifted. Write the resulting *fact* instead: not "this unblocked 31
  cases", but what the app actually does.
- **Locator and Playwright technique** — that belongs in
  `.agents/rules/mcp-playwright.md`.
- **Anything the code or git history already says.**

The test is simple: if a line would need editing after the next test run, it does not
belong here. A note should stay true until the *product* changes.

The app moves. When the browser contradicts a note, fix the note in the same session;
a stale note is worse than a missing one.
