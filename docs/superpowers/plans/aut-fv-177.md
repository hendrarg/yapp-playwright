# AUT-FV-177 Recent Product Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align AUT-FV-177 with the current recency-based recommendation behavior and automate it as one UI-only Buyer journey.

**Architecture:** Google Sheets remains the source of truth. The Playwright test captures `Recommended For You` product links, compares them with the leading `/explore/products` links, and opens the captured recommendation; `ExplorePage` owns all locators and assertions.

**Tech Stack:** TypeScript, Playwright, Google Sheets connector, existing Yapp fixtures and page objects.

## Global Constraints

- Use one `authTest` tagged `@AUT-FV-177 @explore @buyer @regression`.
- Do not use API baselines, additional Buyer accounts, hardcoded recommendation titles, or intermediate Markdown TC files.
- Keep AUT-FV-176 responsible for general product discovery and AUT-FV-177 responsible for Recommended recency ordering.
- Run only mapped Explore tests during development.
- Preserve existing Google Sheet formatting, formulas, validation, and unrelated cells.

---

### Task 1: Align the source test cases and Automation Mapping

**Files:**
- Reference: `docs/superpowers/specs/aut-fv-177-design.md`
- External edit: Google Sheet `12ECspl722v6FUpXedXSef_A4IRRKpWOXD4lYxuLuoHM`

**Interfaces:**
- Consumes: `Explore Page!A20:G33` and `Automation Mapping!A192:O192`.
- Produces: a validated AUT-FV-177 context containing exactly seven active source TC IDs.

- [ ] **Step 1: Re-read the exact target cells before writing**

Use the Google Sheets connector to read:

```text
'Explore Page'!A20:G33
'Automation Mapping'!A192:O192
```

Confirm `TC-EXP-B-021` through `TC-EXP-B-034` are still on rows 20-33 and `AUT-FV-177` is still on row 192.

- [ ] **Step 2: Rewrite the seven active source cases**

Update only columns `B:G`; keep column `A` IDs and columns `H:I` unchanged.

| Row | Epic | Feature | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- | --- | --- |
| 20 | Buyer Product Recommendations | Recommended For You | Display populated Recommended For You section | Buyer opens Explore Page and public products exist | 1. Open the Explore Page<br>2. Review Recommended For You | Recommended For You is visible and contains product cards |
| 21 | Buyer Product Recommendations | Recommendation Ordering | Show newly published public products first | A newly published public product is visible in /explore/products | 1. Open Explore and record Recommended For You<br>2. Open /explore/products<br>3. Compare the leading products | Recommended For You matches the leading public product order |
| 22 | Buyer Product Recommendations | Recommendation Ordering | Show recently updated public products first | A public product was recently updated and appears at the beginning of /explore/products | 1. Open Explore and record Recommended For You<br>2. Open /explore/products<br>3. Compare the leading products | The recently updated product has the same leading position in Recommended For You |
| 26 | Buyer Product Recommendations | Recommendation Content | Display product metadata in recommendations | Recommended For You contains public products | 1. Review each recommendation card<br>2. Verify product name, image, creator, and price | Each recommendation displays product name, image, creator, and price or Free |
| 27 | Buyer Product Recommendations | Recommendation Navigation | Open product detail from a recommendation | Recommended For You contains a product | 1. Select a recommendation<br>2. Observe the destination page | Buyer opens the corresponding product detail page |
| 28 | Buyer Product Recommendations | Public Discovery Eligibility | Include only publicly discoverable products | Recommended For You and /explore/products are populated | 1. Record the recommended product links<br>2. Compare them with /explore/products | Every recommended product exists in the public product list |
| 33 | Buyer Product Recommendations | Recommendation Availability | Keep recommendations populated when public products exist | Publicly discoverable products exist | 1. Open Recommended For You<br>2. Review the section | The section remains populated |

Use `updateCells` with the field mask `userEnteredValue` so wrapping and validation remain unchanged.

- [ ] **Step 3: Mark the unused personalization cases obsolete without changing the schema**

Add this native cell note to title cells `D23:D25` and `D29:D32`:

```text
Obsolete for AUT-FV-177: current development behavior is based on newest or recently updated public products, not personalization signals or fallback sources.
```

Use `updateCells` with the field mask `note`; do not add a Notes column or delete the historical rows.

- [ ] **Step 4: Rewrite the AUT-FV-177 mapping while keeping it Planned**

Update these cells on `Automation Mapping` row 192:

| Cell | Value |
| --- | --- |
| E192 | Explore Page: Recent Product Recommendations |
| F192 | Recent Product Recommendations |
| G192 | TC-EXP-B-021, TC-EXP-B-022, TC-EXP-B-023, TC-EXP-B-027, TC-EXP-B-028, TC-EXP-B-029, TC-EXP-B-034 |
| H192 | 7 |
| J192 | Authenticated Buyer; newest or recently updated public products exist in Explore and /explore/products. |
| K192 | 1. Open Explore and validate the populated recommendation section\n2. Validate recommendation product metadata\n3. Capture visible recommended product links and order\n4. Compare them with the leading public products in /explore/products\n5. Open the first recommended product |
| L192 | Recommended For You is populated, displays product metadata, matches the leading public product order in /explore/products, contains only public products, and opens the selected product detail. |
| O192 | Current development behavior is recency-based. Signal and fallback personalization coverage was removed. |

Leave `N192` as `Planned` until Playwright verification succeeds.

- [ ] **Step 5: Verify the updated context**

Run:

```powershell
$env:YAPP_AUTOMATION_SHEET_ID='12ECspl722v6FUpXedXSef_A4IRRKpWOXD4lYxuLuoHM'
$env:YAPP_AUTOMATION_MAPPING_GID='1448466957'
npm run automation:context -- AUT-FV-177
```

Expected: validation succeeds with scenario `Explore Page: Recent Product Recommendations`, `TC Count` 7, and only `TC-EXP-B-021`, `022`, `023`, `027`, `028`, `029`, and `034`.

---

### Task 2: Add the AUT-FV-177 Playwright journey

**Files:**
- Modify: `tests/buyer/explore.spec.ts`
- Modify: `src/pages/buyer/ExplorePage.ts`

**Interfaces:**
- Consumes: existing `authTest`, `ExplorePage.goto()`, `expectLoaded()`, `expectAuthenticated()`, `openAllProducts()`, `returnToExplore()`, and `productCards()`.
- Produces: `expectRecommendedSectionPopulated()`, `expectRecommendedProductCardMetadata()`, `getRecommendedProducts()`, `expectRecommendationsLeadPublicList()`, and `openRecommendedProduct()`.

- [ ] **Step 1: Write the failing mapped test**

Append this test to `tests/buyer/explore.spec.ts`:

```typescript
test('Explore Page: Recent Product Recommendations', {
  tag: ['@AUT-FV-177', '@explore', '@buyer', '@regression'],
}, async ({ explorePage }) => {
  let recommendations!: Awaited<ReturnType<typeof explorePage.getRecommendedProducts>>;

  await test.step('Open Explore and validate populated recommendations', async () => {
    await explorePage.goto();
    await explorePage.expectLoaded();
    await explorePage.expectAuthenticated();
    await explorePage.expectRecommendedSectionPopulated();
  });

  await test.step('Validate recommendation product metadata', async () => {
    await explorePage.expectRecommendedProductCardMetadata();
  });

  await test.step('Capture recommended product links and order', async () => {
    recommendations = await explorePage.getRecommendedProducts();
  });

  await test.step('Compare recommendations with the leading public products', async () => {
    await explorePage.expectRecommendationsLeadPublicList(recommendations);
  });

  await test.step('Open the first recommended product', async () => {
    await explorePage.returnToExplore();
    await explorePage.openRecommendedProduct(recommendations[0]);
  });
});
```

- [ ] **Step 2: Run the type-check to prove the test is red**

Run:

```powershell
npx tsc --noEmit
```

Expected: FAIL because the five new `ExplorePage` methods do not exist.

- [ ] **Step 3: Add the minimum page-object behavior**

In `src/pages/buyer/ExplorePage.ts`, make the existing metadata assertion accept a section list and add the recommendation-specific wrapper:

```typescript
async expectProductCardMetadata(sections = [this.popularGrid, this.recommendedGrid]) {
  for (const section of sections) {
    const cards = await section.locator('a[href*="/product/"]').evaluateAll((links) => links.map((link) => {
      const text = (link as unknown as { innerText: string }).innerText;
      const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
      const imageCount = link.querySelectorAll('img').length;
      return {
        title: link.querySelector('h3')?.textContent?.trim() || lines[0],
        imageCount,
        hasCreatorVisual: imageCount >= 2 || lines.length >= 5,
        creator: lines[lines.length - 1],
        lines: lines.length,
        text,
      };
    }));

    expect(cards.length, 'Product section must contain cards').toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.title, 'Product name is required').toBeTruthy();
      expect(card.imageCount, `${card.title} must show a product image`).toBeGreaterThan(0);
      expect(card.hasCreatorVisual, `${card.title} must show a creator image or fallback`).toBeTruthy();
      expect(card.creator, `${card.title} must show a creator name`).not.toMatch(/^(?:Free|(?:Rp|\$)\s?[\d.,]+)$/);
      expect(card.lines, `${card.title} must show product and creator metadata`).toBeGreaterThanOrEqual(3);
      expect(card.text, `${card.title} must show a price or Free`).toMatch(/(?:Rp|\$)\s?[\d.,]+|Free/);
    }
  }
}

async expectRecommendedProductCardMetadata() {
  await this.expectProductCardMetadata([this.recommendedGrid]);
}
```

Add these methods next to the existing product methods:

```typescript
async expectRecommendedSectionPopulated() {
  await expect(this.recommendedHeading).toBeVisible();
  await expect.poll(() => this.recommendedGrid.locator('a[href*="/product/"]').count()).toBeGreaterThan(0);
}

async getRecommendedProducts(): Promise<ProductCard[]> {
  return this.productCards(this.recommendedGrid);
}

async expectRecommendationsLeadPublicList(recommendations: readonly ProductCard[]) {
  expect(recommendations.length, 'Recommended For You must contain products').toBeGreaterThan(0);
  await this.openAllProducts();
  const publicProducts = await this.productCards(this.page.locator('main'));
  expect(publicProducts.length, 'Public product list must contain recommendations').toBeGreaterThanOrEqual(
    recommendations.length,
  );
  expect(publicProducts.slice(0, recommendations.length)).toEqual([...recommendations]);
}

async openRecommendedProduct(product: ProductCard) {
  expect(product, 'Recommended For You must contain a product').toBeTruthy();
  await safeClick(this.recommendedGrid.locator(`a[href="${product.href}"]`));
  await expect(this.page).toHaveURL(new URL(product.href.slice(1), this.baseURL).toString());
}
```

In `expectProductsInPublicList()`, delete only the prefix-order assertion below so AUT-FV-176 checks membership while AUT-FV-177 owns ordering:

```typescript
expect(listed.slice(0, products.recommended.length).map(({ href }) => href)).toEqual(
  products.recommended.map(({ href }) => href),
);
```

- [ ] **Step 4: Run type-check and the isolated AUT-FV-177 test**

Run:

```powershell
npx tsc --noEmit
npx playwright test tests/buyer/explore.spec.ts --project=chromium --grep @AUT-FV-177
```

Expected: type-check passes and one Chromium test passes.

- [ ] **Step 5: Commit the implementation**

```powershell
git add -- src/pages/buyer/ExplorePage.ts tests/buyer/explore.spec.ts
git commit -m "test: automate AUT-FV-177 recommendations"
```

---

### Task 3: Verify ownership and complete the mapping

**Files:**
- Verify: `src/pages/buyer/ExplorePage.ts`
- Verify: `tests/buyer/explore.spec.ts`
- External edit: `Automation Mapping!N192`

**Interfaces:**
- Consumes: the passing AUT-FV-176 and AUT-FV-177 tests.
- Produces: a clean repository and AUT-FV-177 status `Automated`.

- [ ] **Step 1: Run final Explore verification**

```powershell
npx tsc --noEmit
npx playwright test tests/buyer/explore.spec.ts --project=chromium --grep "@AUT-FV-176|@AUT-FV-177"
```

Expected: type-check passes and both Explore mappings pass with one worker.

- [ ] **Step 2: Review the diff and tag ownership**

```powershell
rg -n "@AUT-FV-177|expectRecommendationsLeadPublicList|console\.log|test\.only" src/pages/buyer/ExplorePage.ts tests/buyer/explore.spec.ts
git diff --check
git status --short
```

Expected: exactly one AUT-FV-177 test, no diagnostic logs or `test.only`, and no whitespace errors.

- [ ] **Step 3: Mark the mapping Automated only after success**

Re-read `Automation Mapping!A192:O192`, update `N192` from `Planned` to `Automated`, and re-read the row. Preserve the existing `WRAP` formatting and any validation.

- [ ] **Step 4: Verify Sheet values and repository state**

Re-read:

```text
'Automation Mapping'!A192:O192
'Explore Page'!A20:G33
```

Confirm the seven mapped IDs, `TC Count` 7, status `Automated`, updated source cases, obsolete cell notes, and an otherwise clean Git working tree.
