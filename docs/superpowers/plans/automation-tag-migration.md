# Automation Tag Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace buyer legacy `@TAT-B-*` tags with `Automation Mapping` `@AUT-*` tags and mark every mapping with an existing Playwright implementation as `Automated`.

**Architecture:** Keep Playwright's native tag arrays and the existing Google Sheet; add no tag registry or migration script. The many-to-many crosswalk is applied directly to buyer specs, repository instructions use exact `@AUT-*` IDs, and the sheet retains remaining-scope information in Notes without a partial status.

**Tech Stack:** TypeScript, Playwright Test tags, Markdown repository instructions, Google Sheets batch updates, PowerShell verification.

## Global Constraints

- `Automation Mapping` and its active source TC sheets are the only spreadsheet sources of truth.
- `Buyer AT` and `TC Buyer Old` must not be read or referenced after migration.
- Use exact mapping tags such as `@AUT-E2E-008` and `@AUT-FV-216`; do not prefix them with another `T`.
- Remove buyer legacy `@TAT-B-*` tags instead of keeping dual tags.
- Use only `Planned` and `Automated`; any mapping with current code is `Automated`.
- Keep missing mapped behavior in Notes and remove legacy `AT-B-*` references from Notes.
- Preserve existing feature, role, priority, and optional tags.
- Add no dependency, abstraction, or generated tag registry.

---

### Task 1: Replace Buyer Test ID Tags

**Files:**
- Modify: `tests/buyer/feeds.spec.ts:8`
- Modify: `tests/buyer/profile.spec.ts:5`
- Modify: `tests/buyer/explore.spec.ts:4`
- Modify: `tests/buyer/chart.spec.ts:4`
- Modify: `tests/buyer/library.spec.ts:4`
- Modify: `tests/buyer/message.spec.ts:4`

**Interfaces:**
- Consumes: exact `Automation ID` values from `Automation Mapping`.
- Produces: Playwright tests filterable with `npx playwright test --grep @AUT-...` and no buyer `@TAT-B-*` tags.

- [ ] **Step 1: Run the legacy-tag audit and confirm it fails the target state**

Run:

```powershell
rg -n "@TAT-B-" tests/buyer
```

Expected: 23 matching test tag entries across the six buyer spec files.

- [ ] **Step 2: Replace tag arrays in `tests/buyer/feeds.spec.ts`**

Replace only the legacy ID element in each existing tag array; keep all existing non-ID tags. Use these exact mapping tag sets in test order:

```typescript
['@AUT-FV-175', '@AUT-FV-213', '@AUT-FV-237', '@AUT-FV-243']
['@AUT-FV-175', '@AUT-FV-238']
['@AUT-FV-216', '@AUT-FV-218', '@AUT-FV-239', '@AUT-FV-246', '@AUT-FV-247']
['@AUT-FV-217', '@AUT-FV-218', '@AUT-FV-244', '@AUT-FV-248']
['@AUT-E2E-008', '@AUT-FV-213', '@AUT-FV-237', '@AUT-FV-238', '@AUT-FV-240', '@AUT-FV-243']
['@AUT-FV-215', '@AUT-FV-237', '@AUT-FV-244']
['@AUT-FV-238']
['@AUT-FV-237']
['@AUT-FV-213', '@AUT-FV-214', '@AUT-FV-237', '@AUT-FV-239']
['@AUT-FV-246']
['@AUT-FV-213', '@AUT-FV-237', '@AUT-FV-243']
```

The sets correspond respectively to Browse Feed, Follow/Unfollow, Like/Unlike, Comment, Exclusive Unlock, Media Preview, Guest Follow, Free Post, Member Badge, Like Idempotency, and Locked Media.

- [ ] **Step 3: Replace tag arrays in `tests/buyer/profile.spec.ts`**

Replace only the legacy ID element in each existing tag array; keep all existing non-ID tags. Use these exact mapping tag sets in test order:

```typescript
['@AUT-FV-214', '@AUT-FV-237', '@AUT-FV-243', '@AUT-FV-294', '@AUT-FV-295', '@AUT-FV-296']
['@AUT-E2E-009', '@AUT-FV-068', '@AUT-FV-069', '@AUT-FV-070', '@AUT-FV-072', '@AUT-FV-073', '@AUT-FV-294', '@AUT-FV-295', '@AUT-FV-296']
['@AUT-FV-214']
['@AUT-FV-246']
['@AUT-FV-248']
['@AUT-FV-070']
['@AUT-FV-070']
['@AUT-FV-294']
```

The sets correspond respectively to Creator Profile, Tip Success, Membership Browse, Guest Like, Guest Comment, Invalid Tip, Currency Switch, and Share Profile.

- [ ] **Step 4: Replace obsolete shared smoke tags**

Use one exact active mapping tag per smoke test while preserving feature, role, and priority tags:

```typescript
// tests/buyer/explore.spec.ts
'@AUT-FV-175'

// tests/buyer/chart.spec.ts
'@AUT-FV-016'

// tests/buyer/library.spec.ts
'@AUT-FV-103'

// tests/buyer/message.spec.ts
'@AUT-FV-009'
```

- [ ] **Step 5: Run focused tag verification**

Run:

```powershell
rg -n "@TAT-B-" tests/buyer
rg -n "@AUT-" tests/buyer
npx playwright test --project=chromium --list --grep @AUT-FV-216
npx playwright test --project=chromium --list --grep @AUT-E2E-008
```

Expected: the first command has no output; the second lists all 23 buyer test entries; `@AUT-FV-216` lists the Like/Unlike test; `@AUT-E2E-008` lists the Exclusive Unlock test.

- [ ] **Step 6: Type-check and commit**

Run:

```powershell
npx tsc --noEmit
git add tests/buyer
git commit -m "test: migrate buyer tags to automation mappings"
```

Expected: TypeScript exits 0 and the commit contains only buyer spec tag changes.

---

### Task 2: Align Repository Tag Instructions

**Files:**
- Modify: `AGENTS.md:42`
- Modify: `.agents/rules/testing.md:39`
- Modify: `.agents/skills/tag-compliance/SKILL.md:10`
- Modify: `.agents/skills/add-test-spec/SKILL.md:9`
- Modify: `.agents/commands/automation.md:1`
- Modify: `.agents/commands/test-grep.md:1`

**Interfaces:**
- Consumes: the exact `@AUT-*` convention implemented in Task 1.
- Produces: generation, audit, and isolated-run instructions that use Automation Mapping IDs.

- [ ] **Step 1: Confirm outdated mapped-automation examples still exist**

Run:

```powershell
rg -n "@TAT-B-|@T<TC-ID>|--grep @T" AGENTS.md .agents
```

Expected: current documentation contains buyer legacy examples and generic local-TC grep instructions.

- [ ] **Step 2: Update `AGENTS.md` mapped automation rules**

Make the command and required-tag examples use exact mapping IDs:

```markdown
| `npx playwright test tests/buyer/feeds.spec.ts --grep @AUT-E2E-008` | Run one mapped automation by tag |

- `@<Automation ID>` such as `@AUT-E2E-008` for `/automation` output
- one feature tag such as `@feeds`
- one role tag: `@buyer` or `@creator`
- one priority tag: `@smoke`, `@regression`, or `@sanity`
```

Replace the buyer Test Case Flow with the mapped `/automation` flow. Keep `/tc` only as a non-buyer local-only workflow; it must not contain a buyer `@TAT-B-*` example or become a dependency of `/automation`.

- [ ] **Step 3: Update testing and tag-compliance rules**

In `.agents/rules/testing.md`, use this mapped example:

```typescript
test('description', { tag: ['@AUT-FV-216', '@feature', '@role', '@priority'] }, async ({ pageObject }) => {
  // test body
});
```

Document `@AUT-E2E-*` and `@AUT-FV-*` as the required ID category for mapped automation. In `.agents/skills/tag-compliance/SKILL.md`, audit for either active mapping tags or still-supported non-buyer local TC tags with:

```powershell
rg -P "tag: \[(?![^\]]*'@(AUT-|TAT-(A|C)-))" tests
```

This permits existing auth/creator local tags while rejecting buyer legacy `@TAT-B-*` tags.

- [ ] **Step 4: Update generation and command instructions**

In `.agents/skills/add-test-spec/SKILL.md`, add this rule to the Sheet automation workflow and its verification command:

```markdown
- Tag every generated test with the exact Automation ID, for example `@AUT-E2E-008`.
- Run `npx playwright test tests/{domain}/{feature}.spec.ts --project=chromium --grep @<AUT-ID>`.
```

Retain only `@TAT-A-*` and `@TAT-C-*` examples inside the explicitly named Local Markdown workflow; remove every `@TAT-B-*` example. Update `.agents/commands/automation.md` and `.agents/commands/test-grep.md` to show:

```powershell
npx playwright test tests/buyer/feeds.spec.ts --project=chromium --grep @AUT-E2E-008
```

- [ ] **Step 5: Run documentation audits and commit**

Run:

```powershell
rg -n "@TAT-B-" AGENTS.md .agents tests/buyer
rg -n "@AUT-" AGENTS.md .agents tests/buyer
rg -P "tag: \[(?![^\]]*'@(AUT-|TAT-(A|C)-))" tests
git diff --check
git add AGENTS.md .agents/rules/testing.md .agents/skills/tag-compliance/SKILL.md .agents/skills/add-test-spec/SKILL.md .agents/commands/automation.md .agents/commands/test-grep.md
git commit -m "docs: use automation mapping tags"
```

Expected: no buyer legacy matches; the compliance audit has no output; `git diff --check` exits 0; the commit contains only instruction changes.

---

### Task 3: Normalize Automation Mapping Status and Notes

**Files:**
- Modify externally: Google Sheet `Automation Mapping`, columns `N:O`.

**Interfaces:**
- Consumes: the 28 unique `@AUT-*` tags assigned in Task 1.
- Produces: `Automation Status = Automated` and Notes without any `AT-B-*` reference for every mapping with current code.

- [ ] **Step 1: Read current target cells and validation**

Read columns `A`, `N`, and `O` for these Automation IDs:

```text
AUT-E2E-008, AUT-E2E-009,
AUT-FV-009, AUT-FV-016, AUT-FV-068, AUT-FV-069, AUT-FV-070,
AUT-FV-072, AUT-FV-073, AUT-FV-103, AUT-FV-175,
AUT-FV-213, AUT-FV-214, AUT-FV-215, AUT-FV-216, AUT-FV-217,
AUT-FV-218, AUT-FV-237, AUT-FV-238, AUT-FV-239, AUT-FV-240,
AUT-FV-243, AUT-FV-244, AUT-FV-246, AUT-FV-247, AUT-FV-248,
AUT-FV-294, AUT-FV-295, AUT-FV-296
```

The list contains 29 unique mapping IDs. Confirm every ID appears exactly once before writing.

- [ ] **Step 2: Batch-update status and remove retired references**

For all 29 rows:

```text
Automation Status = Automated
```

In Notes, remove the suffix beginning with ` | Legacy coverage:`. Preserve the original feature/scope note. For `AUT-FV-009`, `AUT-FV-016`, and `AUT-FV-103`, append respectively:

```text
Existing Playwright coverage: buyer Messages authenticated page-load smoke test; remaining mapped behavior is listed by active TC IDs.
Existing Playwright coverage: buyer Cart authenticated page-load smoke test; remaining mapped behavior is listed by active TC IDs.
Existing Playwright coverage: buyer Library authenticated page-load smoke test; remaining mapped behavior is listed by active TC IDs.
```

Do not add `AT-B-*`, `Buyer AT`, or `TC Buyer Old` to any cell.

- [ ] **Step 3: Re-read and verify all updated rows**

Read the same `A`, `N`, and `O` cells again.

Expected:

```text
29/29 statuses equal Automated
0 Notes contain Legacy coverage:
0 Notes contain AT-B-
```

---

### Task 4: Final Migration Verification

**Files:**
- Verify: `tests/buyer/*.spec.ts`
- Verify: `AGENTS.md`
- Verify: `.agents/`
- Verify externally: Google Sheet `Automation Mapping`.

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: evidence that buyer automation runs and documentation no longer depends on retired IDs.

- [ ] **Step 1: Run repository audits**

Run:

```powershell
rg -n "@TAT-B-|Buyer AT|TC Buyer Old" tests/buyer AGENTS.md .agents
rg -P "tag: \[(?![^\]]*'@(AUT-|TAT-(A|C)-))" tests
git diff --check
git status --short
```

Expected: the first two commands have no output, `git diff --check` exits 0, and the worktree is clean after the task commits.

- [ ] **Step 2: Run TypeScript and Playwright discovery verification**

Run:

```powershell
npx tsc --noEmit
npx playwright test --project=chromium --list
npx playwright test --project=chromium --list --grep @AUT-E2E-008
npx playwright test --project=chromium --list --grep @AUT-FV-070
```

Expected: TypeScript exits 0; Playwright lists the suite; Exclusive Unlock is listed for `@AUT-E2E-008`; tip tests are listed for `@AUT-FV-070`.

- [ ] **Step 3: Report the migration**

Report:

```text
- buyer legacy tags removed
- 23 buyer tests retagged
- 29 Automation Mapping rows marked Automated
- retired sheet references removed from active workflow
- verification commands and their exit results
```
