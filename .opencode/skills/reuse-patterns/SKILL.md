---
name: reuse-patterns
description: Detect and extract shared locators, steps, and functions across tests to avoid duplication
---

## When to use
Use when creating a new page object, test spec, or helper. Before writing new code, scan existing code for identical or similar patterns that can be reused.

---

## 1. Reuse locators

**Rule**: If a locator already exists in another page object with the same selector, don't rewrite it — extract to shared or reference it.

### Pattern: Extract to shared locator file

When the same element (e.g. `nameInput`, `saveButton`, `searchField`) appears across multiple pages:

```typescript
// src/pages/shared/locators.ts
import type { Page } from "@playwright/test";

export const nameInput = (page: Page) => page.getByLabel("Name");
export const saveButton = (page: Page) => page.getByRole("button", { name: "Save" });
export const searchField = (page: Page) => page.getByPlaceholder("Search...");
```

Then in page objects:

```typescript
// src/pages/buyer/CreatePage.ts
import { nameInput, saveButton } from "./shared/locators";

export class CreatePage {
  readonly nameInput = nameInput(this.page);   // reuse
  readonly saveButton = saveButton(this.page);  // reuse
}
```

```typescript
// src/pages/buyer/EditPage.ts
import { nameInput, saveButton } from "./shared/locators";

export class EditPage {
  readonly nameInput = nameInput(this.page);   // same locator, no rewrite
  readonly saveButton = saveButton(this.page);  // same locator, no rewrite
}
```

### When to extract
| Condition | Action |
|-----------|--------|
| Same locator in 2+ page objects | Move to `src/pages/shared/locators.ts`, reference from both pages |
| Same locator pattern with different label (e.g. "Name" vs "Email") | Create a parameterized function: `inputByLabel(label: string) => page.getByLabel(label)` |
| Locator is page-specific | Keep in page object (no extraction) |

---

## 2. Reuse step sequences

**Rule**: If the same sequence of actions appears in 2+ test specs, extract to a helper function.

### Pattern: Extract to helper

```typescript
// Before (duplicated in 2 specs):
await page.goto("/products");
await page.getByLabel("Name").fill("Test Product");
await page.getByRole("button", { name: "Save" }).click();
await expect(page.locator(".toast")).toHaveText("Product created");

// After (extracted):
// src/helpers/product/createProduct.ts
export async function createProduct(page: Page, name: string) {
  await page.goto("/products");
  await page.getByLabel("Name").fill(name);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator(".toast")).toHaveText("Product created");
}
```

### When to extract
| Repetitions | Action |
|-------------|--------|
| 2+ test specs have identical 3+ step sequence | Extract to `src/helpers/{domain}/{action}.ts` |
| Steps are similar but not identical | Parameterize the differences |
| Only 1 test uses it | Keep inline (but still check if locators can be shared) |

---

## 3. Reuse functions

**Rule**: Check existing utils/helpers before creating a new function.

### Checklist before writing a new function
1. Does `src/utils/playwright.utils.ts` already have it? (safeClick, safeFill, safeCheck, waitForLoaded, navigateAndWait)
2. Does `src/utils/flaky-utils.ts` already have it? (flakyClick, flakyFill, flakyGoto, flakyExpectText, retryUntil)
3. Does any existing helper in `src/helpers/` do the same thing?
4. Does any page object already have a method with the same logic?

### If function already exists but doesn't quite fit
- Add a parameter instead of copying + modifying
- Or create a thin wrapper that delegates to the existing function

---

## 4. Reference existing tests before writing

Before writing a new test spec:
1. Read 1-2 existing test specs in the same domain for style reference
2. Check if the page object already exists (use `add-page-object` skill if not)
3. Check if existing helpers cover the setup/login steps
4. Check if similar locators exist in shared locators or other page objects

---

## Examples

### Example 1: Reuse locator across Create + Edit page

```
CreatePage.ts:  nameInput = page.getByLabel('Name')
EditPage.ts:    NEED nameInput for the same field
```

**Don't** — rewrite `page.getByLabel('Name')` in EditPage.  
**Do** — extract to `src/pages/shared/locators.ts` → both pages import it.

### Example 2: Reuse step sequence across tests

```
Test A: Login → goto explore → search product → assert
Test B: Login → goto explore → search product → add to cart
```

Steps 1-3 are identical. Extract `searchProduct(page, query)` helper. Test A and Test B both call it.

### Example 3: Reuse function pattern

```
Need: click with 3 retries
```

Check `flaky-utils.ts` → already has `flakyClick()` with retries. Don't rewrite.
