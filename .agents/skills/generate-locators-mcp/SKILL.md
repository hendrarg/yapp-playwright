---
name: generate-locators-mcp
description: Generate smartLocator definitions from MCP Playwright browser snapshots while following mapped test case steps
---

## When to use

Use when creating or fixing page-object locators during `/automation <AUT-ID>` or flaky-test diagnosis. Required whenever a new locator is needed and the DOM has not been inspected yet.

Read this skill before writing locators from assumption or copied CSS classes.

## Workflow

Follow the mapped test case steps in order until the flow is complete. Do not skip ahead or invent locators without browser evidence.

### 1. Navigate to the step's page state

- Use MCP Playwright browser tools to reach the exact UI state for the current manual TC step.
- Authenticate with the same fixture the test will use (`authTest` for buyer, `creatorAuthTest` for creator).

### 2. Capture the DOM

- Take a browser snapshot (accessibility tree) at each step before defining locators.
- Note the element's **role**, **accessible name**, **label**, **placeholder**, and any **`data-testid`**.

### 3. Map snapshot → StrategyMeta

| DOM signal | `smartLocator` field |
|------------|----------------------|
| `data-testid="..."` | `testId` |
| role + accessible name | `role`, `name` |
| visible text | `text` |
| `<label>` association | `label` |
| placeholder attribute | `placeholder` |
| none of the above | `selector` (last resort only) |

Provide **at least two strategies** per locator. Never use DevTools CSS class chains as the only strategy.

### 4. Write the page-object locator

```typescript
import { smartLocator } from "@utils/heal-utils";

readonly submitButton = smartLocator(this.page, {
  testId: "submit-order",
  role: "button",
  name: "Place order",
  text: "Place order",
});
```

### 5. Verify in the same browser session

- Interact with the locator strategy (click, fill, assert visible) before moving to the next TC step.
- If the primary strategy fails, confirm which fallback matches the snapshot — do not add guessed CSS.

### 6. Continue until the test case finishes

- Repeat steps 1–5 for every UI interaction in the mapped automation.
- Only then append the Playwright spec calling page-object methods.

## Forbidden

- Copying Tailwind/CSS class chains from existing page objects without a snapshot
- Defining locators in spec files
- Single-strategy `page.locator('.class')` or lone `getByRole` without fallback
- Stopping after navigation — complete all TC steps in the browser first

## When snapshot and code disagree

If MCP snapshot shows a different accessible name than expected (e.g. `"Following Unfollow"` instead of `"Unfollow"`):

1. Trust the snapshot
2. Update `StrategyMeta` to match reality
3. Log the mismatch in the working conversation

Load `.agents/skills/resolve-flaky-tests/SKILL.md` if the element is intermittently missing.

## Related skills

- `add-test-spec` — append spec after locators are validated
- `add-page-object` — scaffold file using these locators
- `resolve-flaky-tests` — diagnose when snapshot-driven locators still fail
