---
name: monkies-tickets
description: Use when creating or updating Monkies task-tracker cards from QA work — bug tickets from the Bugs sheet, per-feature "test activities" testing tickets, and verify→DONE moves. Triggers include "buat ticket bugs", "create ticket monkies", "buat ticket test activities", "update ticket <KEY>", "pindah ke DONE/TESTING", or any request that turns a finding or a day's testing into a Monkies card.
---

# Monkies Tickets

The workflow for turning QA findings and testing activity into Monkies cards. Monkies is the
dev/QA task tracker (HTTP MCP server); the Bugs sheet is the source of truth for findings and
the card's link back is the sheet's **Ticket** column (K). Product behaviour goes to
`.agents/knowledge/`, not here.

## Always re-derive IDs per session

The account/workspace changed on 22 Sep 2026 and every old id is dead. Start each session with
`list_workspaces` → then `list_projects` / `list_columns` / `list_task_categories` /
`list_assignees`. Never trust ids written down in notes.

- Workspace **Yapp**, role **MEMBER** (matters — see delete gotcha).
- Columns: **TO DO**, **IN PROGRESS**, **TESTING**, **DONE**.
- Categories: **BUG**, **TASK**.
- Projects are **one per feature area** (code → key prefix): Tipping Page `TIP`, Add to Cart
  `ATC`, Wallet `WAL`, Membership `MEM`, Product – Event & Tickets `P-E`, Online Course `OC`,
  Creator Page / Tools `CP`, Checkout Page `CPA`, Admin Platform `AP`, Livestream `LIV`, …

## MCP call mechanics (gotchas)

- `create_task` **ignores `assigneeIds`** → the card comes back `assigneeId: null`. Set the
  assignee with a follow-up `update_task { assigneeId }`.
- A card gets a **key only when it has a `projectId`**; a workspace-only card is `key: null`.
  Pass `projectId` on create (or `update_task { projectId }`) to mint the key.
- `update_task` requires **`workspaceId` + `taskIdOrKey`** (not `taskId`). It moves columns via
  `{ columnId }`. Prefer it over `move_tasks` (which wants a `tasks` array) for a single move.
- **`delete_task` needs workspace ADMIN** — as MEMBER it returns `403
  NOT_ADMIN_OF_WORKSPACE`, even for a card you just created. You cannot un-create via MCP:
  retitle `[SUPERSEDED → …]`, repoint the body, and ask the user to delete in the web UI. So
  **create carefully the first time.** (`create` / `update` / `add_comment` all work as MEMBER.)
- Auth: if the server answers "requires authentication", `authenticate` returns a URL for the
  user; after a wrong-account login they clear it with `/mcp` and re-authorize.

## Bug ticket (from a Bugs-sheet row)

"Buat ticket bugs `<M-xx>`" =:

1. **Read the row first** from the Bugs tab — IDs shift on renumber/deletion, so the id in old
   notes may be stale. Grab Module, Title, Steps, Expected, Actual, Detail, Related TC.
2. `create_task`: `columnId` = TO DO, `categoryId` = BUG, `projectId` = the project matching the
   row's **Module**, `title` = `[FE]/[BE] <Module> - <what breaks>` (FE vs BE from where the
   fault is, not where it shows). Body keeps the sheet sections (Ringkasan / Steps / Expected /
   Actual / Root cause / Notes / Related TC) and opens with the Bug ID.
3. `update_task { assigneeId }` if an assignee was named (leave empty otherwise).
4. Write the issued **key back to the row's Ticket column (K)** in the same session.

**The card body's Bug-ID is a creation-time snapshot; column K is the live link.** After a sheet
renumber the body's `M-xx` goes stale — do **not** rewrite closed/old cards to chase the new
number; align sheet↔card by K, which stays glued to the row. Only fix a body you authored **this
session** whose id a same-session renumber just changed.

## Test-activities ticket (per feature, not a daily log)

Log testing as **one card per feature**, never a single combined daily card (convention seen in
`P-E-18`, `MEM-11`):

1. One card **per feature area** touched that day.
2. `title` = `[T] <Feature> - <scope>` (`[TEST]` also seen; prefer `[T]`).
3. `categoryId` = **TASK**, `projectId` = the feature project (so it gets a key), `columnId` =
   **TESTING**.
4. `update_task { assigneeId }` = the tester.
5. Body shape:
   ```
   Testing <date>. Env: <env>. Buyer/creator: <account>.
   Cakupan:
   - <what was exercised>
   Hasil:
   - <TC id / bug id> — <result> (Passed / expected / bug → <KEY>)
   Open: <remaining, or ->
   ```
   Reference the source (Bugs sheet / Yapp - Test Case tab). Keep **status facts** (Passed /
   expected / bug) here; do not duplicate them into `.agents/knowledge/`.

## Verify → DONE (a card in TESTING)

`get_task` (recall the repro) → retest on staging (token1 QA / token2 sundanese) → `add_comment`
with the QA verdict (state env, account, date, evidence, and any honest caveat — e.g. a symptom
that couldn't be re-exercised) → `update_task { columnId: <DONE> }`. **Never move to DONE without
a QA comment.** Confirm the column move with the user when they asked to be consulted.
