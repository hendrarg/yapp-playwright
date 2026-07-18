# AUT-FV-175 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate one UI-only Playwright journey for Buyer creator search/discovery and remove creator ownership from AUT-FV-176.

**Architecture:** Reuse the existing `ExplorePage`, Explore fixture, and static Explore data. Add only main-search and creator-card behavior, remove incorrect duplicate AUT-FV-175 tags, then keep AUT-FV-176 product-only.

**Tech Stack:** TypeScript, Playwright Test, Google Sheets Automation Mapping

## Global Constraints

- Keep one journey test per Automation ID.
- Do not add API listeners, helpers, dependencies, or intermediate Markdown.
- Validate creator category only for creators whose card renders a category.
- Accept an avatar image or initial fallback.
- Never use positional `.first()` to hide ambiguity.
- Run only `@AUT-FV-175` and `@AUT-FV-176` while developing.

---

### Task 1: Write the AUT-FV-175 journey first

**Files:**
- Modify: `src/test-data/buyer/explore.data.ts`
- Modify: `tests/buyer/explore.spec.ts`
- Modify: `tests/buyer/feeds.spec.ts`

**Interfaces:**
- Consumes: existing `authTest`, `explorePage`, and `exploreData`.
- Produces: desired `ExplorePage.searchCreators()`, `expectCreatorResults()`, `expectExactCreatorResult()`, `expectNoCreatorResults()`, `clearSearch()`, `expectRecommendedCreators()`, `openSearchCreator()`, `openRecommendedCreator()`, and `expectFullCreatorResults()` calls.

- [ ] **Step 1: Add stable creator-search data**

Extend `exploreData` with:

```typescript
creatorDiscovery: {
  displayNameQuery: 'Jason',
  usernameQuery: 'yoms07',
  noMatchQuery: 'no-creator-aut-fv-175',
  selectedCreator: { name: 'Jason', username: '@yoms07', href: '/yoms07' },
  expectedCreators: [
    { name: 'Jason', username: '@yoms07', category: 'Education' },
    { name: 'HOHO', username: '@testuser123' },
    { name: 'mutiajaveline', username: '@mutiajaveline' },
    { name: 'iyansr32', username: '@iyansr32', category: 'Politics' },
  ],
},
```

- [ ] **Step 2: Replace the placeholder AUT-FV-175 test**

Replace the authentication-only test with one journey:

```typescript
test('Explore Page: Search & Creator Discovery', {
  tag: ['@AUT-FV-175', '@explore', '@buyer', '@smoke', '@regression'],
}, async ({ explorePage }) => {
  const data = exploreData.creatorDiscovery;
  let matchingCreatorHrefs: string[] = [];

  await test.step('Open Explore and validate creator Search', async () => {
    await explorePage.goto();
    await explorePage.expectLoaded();
    await explorePage.expectAuthenticated();
    await explorePage.expectSearchVisible();
  });

  await test.step('Search by display name and validate matching creators', async () => {
    await explorePage.searchCreators(data.displayNameQuery);
    matchingCreatorHrefs = await explorePage.expectCreatorResults(data.displayNameQuery, 2);
  });

  await test.step('Replace the query with a username and validate updated results', async () => {
    await explorePage.searchCreators(data.usernameQuery);
    await explorePage.expectExactCreatorResult(data.selectedCreator);
  });

  await test.step('Validate the creator empty state for a no-match query', async () => {
    await explorePage.searchCreators(data.noMatchQuery);
    await explorePage.expectNoCreatorResults(data.noMatchQuery);
  });

  await test.step('Validate Creators For You metadata', async () => {
    await explorePage.clearSearch();
    await explorePage.expectRecommendedCreators(data.expectedCreators);
  });

  await test.step('Open a creator from search and Creators For You', async () => {
    await explorePage.searchCreators(data.usernameQuery);
    await explorePage.openSearchCreator(data.selectedCreator.href);
    await explorePage.returnToExplore();
    await explorePage.openRecommendedCreator(data.selectedCreator);
    await explorePage.returnToExplore();
  });

  await test.step('Open the full creator list and validate matching creators', async () => {
    await explorePage.openAllCreators();
    await explorePage.expectFullCreatorResults(data.displayNameQuery, matchingCreatorHrefs);
  });
});
```

- [ ] **Step 3: Remove unrelated AUT-FV-175 tags from feeds**

Delete only `@AUT-FV-175` from:

- `Buyer Explore Feed — Browse, View Tabs & Infinite Scroll`;
- `Buyer Follow/Unfollow Creator — Full Cycle Across Entry Points`.

- [ ] **Step 4: Run the type-check to prove RED**

Run:

```powershell
npx tsc --noEmit
```

Expected: FAIL only because the desired creator-search `ExplorePage` methods do not exist.

---

### Task 2: Add minimum creator-search page behavior

**Files:**
- Modify: `src/pages/buyer/ExplorePage.ts`

**Interfaces:**
- Consumes: `safeClick`, `safeFill`, existing Explore headings/grids, and `baseURL`.
- Produces: the ten public methods referenced by Task 1.

- [ ] **Step 1: Add stable main-search locators**

Add constructor properties:

```typescript
readonly searchInput: Locator;
readonly searchCreatorLinks: Locator;

this.searchInput = page.getByRole('textbox', { name: 'Search', exact: true });
this.searchCreatorLinks = page.locator(
  'main a[href^="/"]:not([href*="/product/"]):not([href^="/campaign/"])',
);
```

- [ ] **Step 2: Add search and result assertions**

Add:

```typescript
async expectSearchVisible() {
  await expect(this.searchInput).toBeVisible();
}

async searchCreators(query: string) {
  await safeFill(this.searchInput, query);
  await expect(this.page).toHaveURL(new RegExp(`keyword=${encodeURIComponent(query)}`));
}

async expectCreatorResults(query: string, minimum: number): Promise<string[]> {
  await expect.poll(() => this.searchCreatorLinks.count()).toBeGreaterThanOrEqual(minimum);
  const results = await this.searchCreatorLinks.evaluateAll((links) => links.map((link) => ({
    href: link.getAttribute('href') ?? '',
    name: link.querySelector('h3')?.textContent?.trim() ?? '',
  })));
  expect(results.every(({ name }) => name.toLowerCase().includes(query.toLowerCase()))).toBeTruthy();
  return results.map(({ href }) => href);
}

async expectExactCreatorResult(creator: { name: string; username: string; href: string }) {
  const card = this.page.locator(`main a[href="${creator.href}"]`);
  await expect(card).toHaveCount(1);
  await expect(card.getByRole('heading', { name: creator.name, exact: true })).toBeVisible();
  await expect(card).toContainText(creator.username);
}

async expectNoCreatorResults(query: string) {
  await expect(this.page.getByText(`No creators found for "${query}"`, { exact: true })).toBeVisible();
}

async clearSearch() {
  await safeFill(this.searchInput, '');
  await expect(this.creatorsHeading).toBeVisible();
}
```

- [ ] **Step 3: Add creator-card metadata and navigation**

Add:

```typescript
async expectRecommendedCreators(creators: readonly {
  name: string;
  username: string;
  category?: string;
}[]) {
  for (const creator of creators) {
    const heading = this.creatorsGrid.getByRole('heading', { name: creator.name, exact: true });
    const card = heading.locator('xpath=ancestor::*[@role="group"][1]');
    await expect(heading).toBeVisible();
    await expect(card).toContainText(creator.username);
    expect(
      await card.locator('img').count() > 0 || await card.getByText(creator.name[0], { exact: true }).count() > 0,
      `${creator.name} must show an avatar or initial fallback`,
    ).toBeTruthy();
    if (creator.category) await expect(card).toContainText(creator.category);
  }
}

async openSearchCreator(href: string) {
  await safeClick(this.page.locator(`main a[href="${href}"]`));
  await expect(this.page).toHaveURL(new URL(href.slice(1), this.baseURL).toString());
}

async openRecommendedCreator(creator: { name: string; href: string }) {
  await safeClick(this.creatorsGrid.getByRole('heading', { name: creator.name, exact: true }));
  await expect(this.page).toHaveURL(new URL(creator.href.slice(1), this.baseURL).toString());
}

async expectFullCreatorResults(query: string, expectedHrefs: string[]) {
  const input = this.page.getByRole('textbox', { name: 'Find creators', exact: true });
  await safeFill(input, query);
  const links = this.page.locator('main a[href^="/"]:has(h3)');
  await expect.poll(() => links.count()).toBe(expectedHrefs.length);
  expect(await links.evaluateAll((items) => items.map((item) => item.getAttribute('href')))).toEqual(expectedHrefs);
}
```

- [ ] **Step 4: Run the type-check to prove GREEN**

Run:

```powershell
npx tsc --noEmit
```

Expected: PASS with exit code `0`.

---

### Task 3: Make AUT-FV-176 product-only

**Files:**
- Modify: `tests/buyer/explore.spec.ts`
- Modify: `src/pages/buyer/ExplorePage.ts`

**Interfaces:**
- Consumes: existing product locators and methods.
- Produces: `expectProductSections()` and `expectPopularOrder()` with no creator argument.

- [ ] **Step 1: Remove creator assertions from the AUT-FV-176 journey**

Change the section and order calls to:

```typescript
await explorePage.expectProductSections();
await explorePage.expectPopularOrder(exploreData.popularProducts);
```

Delete the AUT-FV-176 step that calls `openAllCreators()` and `expectCreatorSearch()`.

- [ ] **Step 2: Narrow the two page-object methods**

Replace the existing methods with:

```typescript
async expectProductSections() {
  await expect(this.popularHeading).toBeVisible();
  await expect(this.recommendedHeading).toBeVisible();
}

async expectPopularOrder(popularProducts: readonly string[]) {
  expect((await this.productCards(this.popularGrid)).map(({ title }) => title)).toEqual([...popularProducts]);
}
```

Keep creator locators and `openAllCreators()` because AUT-FV-175 owns them. Remove `expectCreatorSearch()` after `expectFullCreatorResults()` replaces its only caller.

- [ ] **Step 3: Run both isolated mappings**

Run:

```powershell
npx playwright test tests/buyer/explore.spec.ts --project=chromium --grep @AUT-FV-175
npx playwright test tests/buyer/explore.spec.ts --project=chromium --grep @AUT-FV-176
```

Expected: each command runs exactly one test and passes.

---

### Task 4: Verify, update Automation Mapping, and commit

**Files:**
- Modify in Google Sheets: `Automation Mapping!N190`
- Modify in Google Sheets: `Automation Mapping!K191`

**Interfaces:**
- Consumes: passing TypeScript, AUT-FV-175, and AUT-FV-176 checks.
- Produces: status `Automated` for AUT-FV-175 and product-only flow text for AUT-FV-176.

- [ ] **Step 1: Run final local verification**

Run:

```powershell
npx tsc --noEmit
npx playwright test tests/buyer/explore.spec.ts --project=chromium --grep @AUT-FV-175
npx playwright test tests/buyer/explore.spec.ts --project=chromium --grep @AUT-FV-176
git diff --check
```

Expected: all commands exit `0`; each Playwright command reports `1 passed`.

- [ ] **Step 2: Update exact Sheet cells**

Write:

```text
Automation Mapping!N190 = Automated
Automation Mapping!K191 =
1. Open Explore as Buyer
2. Validate Popular and Recommended section visibility
3. Validate product card metadata
4. Validate system-defined popularity order
5. Validate only eligible public products are shown
6. Open a product from each section
7. Select See More in Popular Products and verify /explore/products opens with the full product list
```

Re-read `A190:O191` and verify AUT-FV-175 is `Automated`, AUT-FV-176 remains `Automated`, and AUT-FV-176 contains no creator step.

- [ ] **Step 3: Commit the verified implementation**

Run:

```powershell
git add src/test-data/buyer/explore.data.ts src/pages/buyer/ExplorePage.ts tests/buyer/explore.spec.ts tests/buyer/feeds.spec.ts
git commit -m "test: automate AUT-FV-175 creator discovery"
```

Expected: one implementation commit containing only the four planned code files.
