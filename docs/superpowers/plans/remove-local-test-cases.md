# Remove Local Test Cases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the obsolete local Markdown test-case workflow while preserving every active Playwright test.

**Architecture:** Google Sheets Automation Mapping becomes the only input for generating new automation. Existing auth and creator tests with legacy `@TAT-A-*` or `@TAT-C-*` tags remain executable until validated `@AUT-*` mappings exist; local Markdown files and `/tc` are removed.

**Tech Stack:** Markdown repository guidance, Playwright, TypeScript, PowerShell, Git

## Global Constraints

- Do not delete or modify existing Playwright test behavior.
- Do not invent Automation Mapping IDs for legacy auth or creator tests.
- Do not edit historical documents under `docs/superpowers/plans/` other than this plan.
- Do not create intermediate Markdown test-case documents.
- Verify any recursively deleted path resolves inside `D:\yapp` before deletion.

---

### Task 1: Remove the local source and command

**Files:**
- Delete: `test-cases/`
- Delete: `.agents/commands/tc.md`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: the approved design in `docs/superpowers/specs/remove-local-test-cases-design.md`
- Produces: a repository with no local Markdown TC storage or `/tc` command

- [ ] **Step 1: Record the pre-removal state**

Run:

```powershell
Get-ChildItem -LiteralPath test-cases -Recurse -File
Test-Path -LiteralPath .agents/commands/tc.md
Select-String -LiteralPath .gitignore -Pattern '/test-cases/'
```

Expected: the Markdown files are listed, the command returns `True`, and `.gitignore` contains `/test-cases/`.

- [ ] **Step 2: Delete only the verified local directory**

Resolve `test-cases`, confirm its absolute path starts with the resolved workspace path plus the directory separator, then remove it recursively with PowerShell `Remove-Item -LiteralPath`.

- [ ] **Step 3: Remove the command and ignore rule**

Use `apply_patch` to delete `.agents/commands/tc.md` and remove only the `/test-cases/` line from `.gitignore`.

- [ ] **Step 4: Verify removal**

Run:

```powershell
Test-Path -LiteralPath test-cases
Test-Path -LiteralPath .agents/commands/tc.md
Select-String -LiteralPath .gitignore -Pattern '/test-cases/'
```

Expected: both paths return `False`; `Select-String` returns no match.

### Task 2: Make active guidance Sheets-only

**Files:**
- Modify: `AGENTS.md`
- Modify: `.agents/skills/add-test-spec/SKILL.md`
- Modify: `.agents/skills/registry.md`
- Modify: `.agents/skills/tag-compliance/SKILL.md`
- Modify: `.agents/rules/testing.md`
- Modify: `.agents/rules/git-hygiene.md`

**Interfaces:**
- Consumes: `/automation <AUT-ID>` and `npm run automation:context -- <AUT-ID>`
- Produces: one documented generation path based on Automation Mapping

- [ ] **Step 1: Run the active-reference audit before editing**

Run:

```powershell
rg -n "test-cases|/tc\b|local (TC|test|Markdown)|supported non-buyer local" AGENTS.md .agents .gitignore
```

Expected: matches in the active files listed above prove the old workflow still exists.

- [ ] **Step 2: Update the repository guide and rules**

Use `apply_patch` to:

- remove `test-cases/` from the architecture block in `AGENTS.md`;
- replace the `/tc` compatibility sentence with a statement that Automation Mapping is the only generation source;
- describe `@TAT-A-*` and `@TAT-C-*` as legacy tags awaiting mapping, not supported local documents;
- remove the local-file exception from `.agents/rules/git-hygiene.md`;
- change the `add-test-spec` registry entry to “Creating automation from a Google Sheets Automation ID.”

- [ ] **Step 3: Rewrite `add-test-spec` as the single Sheets workflow**

Use `apply_patch` to retain the existing Automation Mapping validation, reuse-patterns, fixture, page-object, test-data, locator, type-check, isolated-run, and failure-diagnosis guidance. Remove all `/tc`, `AT-{Domain}-{Type}-{Number}`, filesystem glob, local tag construction, and local examples. Renumber the remaining steps sequentially.

- [ ] **Step 4: Update tag compliance without changing active tests**

Use `apply_patch` to remove references to local test-case documents and `test-cases/`. Keep the current audit regex accepting `@AUT-*`, `@TAT-A-*`, and `@TAT-C-*`, and explicitly require an existing Automation Mapping row before replacing a legacy tag.

- [ ] **Step 5: Verify active instructions**

Run:

```powershell
rg -n "test-cases|/tc\b|local Markdown|supported non-buyer local" AGENTS.md .agents .gitignore
rg -n "@TAT-(A|C)-" tests
```

Expected: the first command returns no matches; the second still lists the 16 preserved auth and creator tests.

### Task 3: Verify and commit the cleanup

**Files:**
- Verify: all files changed in Tasks 1 and 2

**Interfaces:**
- Consumes: the Sheets-only runtime and preserved Playwright tests
- Produces: a checked, committed cleanup on `main`

- [ ] **Step 1: Check patch integrity and historical isolation**

Run:

```powershell
git diff --check
git diff -- docs/superpowers/plans/sheet-automation-generator.md docs/superpowers/plans/automation-tag-migration.md
```

Expected: no whitespace errors and no historical-plan changes.

- [ ] **Step 2: Type-check**

Run:

```powershell
npx tsc --noEmit
```

Expected: exit code `0` with no TypeScript errors.

- [ ] **Step 3: List Playwright tests**

Run:

```powershell
npx playwright test --list
```

Expected: exit code `0`; all specs load and the legacy-tagged auth/creator tests remain discoverable.

- [ ] **Step 4: Review and commit**

Run:

```powershell
git status --short
git diff --stat
git diff
git add AGENTS.md .gitignore .agents docs/superpowers/plans/remove-local-test-cases.md
git commit -m "chore: remove local test case workflow"
```

Expected: only the approved cleanup files are staged and the commit succeeds.
