---
name: resolve-flaky-tests
description: Systematic flaky element resolution — diagnose, apply fix, log pattern for reuse
---

## When to use
Use when a Playwright test fails intermittently with errors like:
- `locator.click()`: Target closed / element is not stable / intercepted
- `locator.fill()`: Element not visible / not found
- `TimeoutError` on navigation or action
- `expect(locator).toBeVisible()` timed out
- `page.waitForSelector()` timed out

## Diagnostic flow

### ⚠️ Golden Rule: Snapshot before blind-fix

**If a test fails 2+ times** with the same error — take a browser snapshot FIRST to inspect the actual DOM. Do NOT guess locators or apply code fixes blindly.

```
Test FAIL (2nd+ time)
  └─ 1. playwright_browser_navigate → navigate to the failing page
  └─ 2. playwright_browser_snapshot   → capture accessibility tree
  └─ 3. Analyze: what are the REAL element roles, names, labels?
  └─ 4. Only THEN apply the fix pattern below
```

Common DOM surprises caught by snapshot:
- Button accessible name is `"Following Unfollow"`, not `"Unfollow"`
- Element is a `<div>` not an `<a>` (no href)
- Text is nested inside `<span>` children, not directly on the button
- Element uses `aria-label` instead of visible text

```
Test FAIL
  ├─ ❌ TimeoutError (element not found)
  │   └─ Is element in Shadow DOM?  → use `locator.page.locator('css=...')`
  │   └─ Is element in iframe?      → `page.frameLocator().locator()`
  │   └─ Is element lazy-loaded?    → scroll + wait (`scrollIntoViewIfNeeded`)
  │   └─ Is there a loading state?  → wait for skeleton/spinner to disappear first
  │
  ├─ ❌ Actionability error (click intercepted / not stable)
  │   └─ Use `safeClick` / `safeFill` / `safeCheck` from @utils/playwright.utils
  │   └─ Add `locator.waitFor({ state: 'stable' })` before action
  │   └─ Use `{ force: true }` only as last resort
  │
  ├─ ❌ StaleElementReferenceError
  │   └─ Re-query locator before each action (don't store stale references)
  │   └─ Use page objects that re-query each time
  │
  └─ ❌ Unexpected redirect / auth challenge
      └─ Token expired → refresh cookie
      └─ reCAPTCHA triggered → add delay or retry
```

## Fix patterns (hierarchical — try top first)

| # | Pattern | When | How |
|---|---------|------|-----|
| 1 | `safeAction` utils | Any click/fill/check | Use `safeClick`, `safeFill`, `safeCheck` from `@utils/playwright.utils` |
| 2 | Scroll into view | Element exists but off-screen | `await locator.scrollIntoViewIfNeeded()` before action |
| 3 | Wait for loading state | Content behind skeleton/spinner | `await page.locator('[data-testid=spinner]').waitFor({ state: 'hidden' })` |
| 4 | Assert visibility first | Flaky assertion | `await expect(locator).toBeVisible({ timeout: 10000 })` |
| 5 | Retry with `flakyAction` | Highly intermittent | Use `flakyClick` / `flakyFill` / `flakyGetByText` from `@utils/flaky-utils` |
| 6 | **Smart selector priority** | CSS selector too brittle | Rewrite with `smartLocator` using fallback chain: testId → role → text → label → placeholder (see `code-style.md`). Use `smartClick`/`smartFill` for direct interaction. |
| 7 | `page.waitForURL` | Navigation timing | `await page.waitForURL('**/expected-path')` after click |
| 8 | Network idle wait | Page has async data | `await page.waitForLoadState('networkidle')` |
| 9 | `{ force: true }` | Overlay blocking click | Last resort: `await locator.click({ force: true })` |
| 10 | Increase timeout | Genuinely slow operation | `test.setTimeout(60000)` or pass `{ timeout: 30000 }` to locator |
| 11 | **Smart fallback healing** | Locator changed on dev FE | Use `smartClick`/`smartFill` with StrategyMeta — auto-fallback through priority chain. Logs to `test-results/heal-log.json`. |

## Self-healing pattern

When a locator breaks because the dev changed the FE (e.g. `getByLabel('Name')` → `getByPlaceholder('Full name')`):

```typescript
import { smartClick, smartFill, smartLocator } from "@utils/heal-utils";

// Option A: smartClick / smartFill with strategy meta
await smartClick(page, {
  testId: 'save-btn',
  role: 'button',
  text: 'Save',
});

// Option B: smartLocator in page objects (RECOMMENDED)
class EditPage {
  readonly nameInput = smartLocator(this.page, {
    testId: 'name-input',
    role: 'textbox',
    label: 'Name',
    placeholder: 'Full name',
  });
}
// await editPage.nameInput.fill("New name");
```

When a fallback succeeds, the system writes to `test-results/heal-log.json`. Run `/flaky-analyze` to inspect.

## Logging a flaky fix

When a fix resolves a flaky test, log it in the test file as a comment near the resolved line:
```typescript
// FLAKY_FIX: used flakyClick instead of safeClick — element occasionally covered by toast
```

This comment signals to the AI in future rounds to prefer `flakyClick` for similar patterns.

## Agent command

Use `.agents/commands/flaky.md` to re-run the last flaky test with trace for diagnosis.

## Verification

After applying a fix:
1. Run the test 3x: `npx playwright test --repeat-each=3 <spec>`
2. If all pass, the fix is considered effective
3. If any fail again, escalate to next fix pattern
