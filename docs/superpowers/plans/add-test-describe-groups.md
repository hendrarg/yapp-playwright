# Add Test Describe Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a feature-level `test.describe` wrapper to every Playwright spec that currently lacks one.

**Architecture:** This is a mechanical source-only refactor. Each affected spec keeps its current fixture and tests, with one outer describe callback added around the existing test declarations.

**Tech Stack:** TypeScript, Playwright Test.

## Global Constraints

- Preserve all existing test logic, names, tags, fixtures, and imports.
- Use feature/file names for describe titles.
- Do not add dependencies or change runtime behavior.

---

### Task 1: Wrap uncovered spec files

**Files:**
- Modify: every `tests/**/*.spec.ts` file without an existing `test.describe` block (23 files identified during audit).

- [ ] **Step 1: Add one outer `test.describe` wrapper per affected file**

Use the existing `tests/buyer/promotions.spec.ts` structure. For a file using an aliased fixture such as `authTest as test`, keep that import and wrap the current declarations with `test.describe('<feature>', () => { ... });`. Do not edit the test bodies.

- [ ] **Step 2: Verify source structure**

Run `rg -L "describe\\(" tests --glob '*.spec.ts'` and expect no output.

- [ ] **Step 3: Type-check**

Run `npx tsc --noEmit` and expect exit code 0.

- [ ] **Step 4: Verify Playwright discovery**

Run `npx playwright test --project=chromium --list` and expect the existing tests to remain discoverable.

- [ ] **Step 5: Review and commit**

Run `git diff --check`, review the diff for wrapper-only changes, then commit with `test: group specs with describe blocks`.
