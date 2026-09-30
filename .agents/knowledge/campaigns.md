---
title: Campaigns
type: note
category: project
tags: [yapp, product, automation, campaigns]
project: yapp
created: 2026-09-30
updated: 2026-09-30
sources: 0
status: active
---

> [[projects/yapp/knowledge/index|Knowledge index]]

# Campaigns

Creator crowdfunding campaigns — list at `/campaigns`, editor under `/profile/...`, buyer page
at `yapp-dev.yapp.ink/campaign/{shortUrl}`. Mapped on dev 2026-09-30 against the Products page,
which the product side treats as the UI standard. Campaigns follow a **different, older
pattern** almost everywhere; compare with [[products]] before assuming shared behaviour.

## Routes

- List: `/campaigns`. Row name/image link to `/profile/campaigns/manage?id={uuid}`; the second
  link in the name cell is the public URL.
- Create: `/profile/campaigns/create` (the `Create Campaign` CTA is a link wrapping a button).
- Edit: `/profile/campaigns/upsert?id={uuid}`, heading `Edit Campaign`.
- Both editor pages carry the page header **`My Page`**, not `Campaigns`.
- API: `POST /api/v1/campaigns`, `PUT /api/v1/campaigns/{uuid}`, status via
  `PUT /api/v1/campaigns/{uuid}/status` with `{"isActive":bool}` (Products use
  `PUT /shop/products/{uuid}/status` with `{"status":"inactive"|"active"}`).

## There is no Draft state

`campaigns` has **only `is_active` (boolean)** — no `status` / `is_draft` column. The editor's
`Save as Draft` sends the same payload as `Publish` with `isActive:false`, so a "draft" is
indistinguishable from an inactive campaign and lands in the **Inactive** tab. `Publish` on edit
sends `isActive:true`, so publishing an inactive campaign reactivates it.

List tabs are `All`, `Active`, `Inactive`, `Collaboration` — no counts and no Draft tab
(Products: `Active (n)` / `Inactive (n)` / `Draft (n)`). A goal-reached campaign shows a
`COMPLETED` badge but stays in the Active tab and its menu still offers `Deactivate`.

## Row actions menu

| Campaigns | Products |
|---|---|
| `Deactivate` / `Activate` (text label flips with state, no switch) | `Set Inactive` + switch (label constant, state in the switch) |
| `Share` | `Hide from Profile` + switch |
| `Edit` | `Edit` |
| `Manage` | `Share` |
| — | `Hide` |
| — | `Delete` |

**No Delete anywhere in the campaign UI**, although the table has `deleted_at` (2 of 37 rows
soft-deleted on dev, 2026-09-30). A campaign created for testing therefore cannot be cleaned up
through the UI — block the `POST` with `page.route` when only FE validation is under test.

Activate/Deactivate commit instantly with **no toast and no confirmation**; only the badge
changes. Products toast `Product set to inactive` / `Product set to active`.

## Inactive does not close the campaign

Same as inactive products ([[products]] → Status lifecycle): an inactive campaign disappears from
the creator profile, but `/campaign/{shortUrl}` stays **200 for guests and members with `Donate`
enabled**, and the donation form (`/campaign/uuid/{uuid}/donate`) opens with `Send Donation`
live. An unknown slug renders an in-page `Error / Failed to load campaign details`, not a 404.

## Form validation

- **No title length rule on the FE**, create or edit. On edit a 1-character title saves
  (`PUT` 200, `Campaign updated successfully`). On create a 4-character title passes the FE and
  the `POST` is sent. The DB holds 3–4 character titles/slugs (latest Jun 2026); whether the BE
  now rejects short slugs on create was not tested (it would create an undeletable row).
- Missing required fields give one generic toast, `Please fill in all required fields before
  proceeding`, with **no inline field errors and no `aria-invalid`**. Goal `0` gives the same
  toast; goal `1` passes — there is no Rp10.000-style floor (a live campaign has goal `Rp 100`).
- **The slug is derived from the title and readonly.** On edit the readonly link preview
  follows the title as you type and the request carries the new `shortUrl`, but the server keeps
  the original slug — the preview shows a link that will not exist.
- Upload copy disagrees: cover `max 50MB`, supporting photos `no larger than 500 MB`. Label
  `Currency to be receive` (sic).
- List money renders `Rp 100.000` (with a space); Products render `Rp0` / `Rp10.000` (no space) —
  see [[currency-format]].
