# Test Describe Groups

## Goal

Ensure every Playwright spec is grouped by a feature-level `test.describe` block.

## Design

Add one outer `test.describe('<feature>', () => { ... })` wrapper to each of the 23 spec files that currently has no describe block. Keep existing imports, fixtures, testcase names, tags, steps, and runtime behavior unchanged. Use the existing buyer promotions spec as the formatting reference.

Single-test legacy specs receive the same wrapper so the repository has one consistent structure; no test logic or tag migration is included.

## Verification

Confirm every `tests/**/*.spec.ts` file contains a describe block, run `npx tsc --noEmit`, and list the affected tests with Playwright without executing external flows.
