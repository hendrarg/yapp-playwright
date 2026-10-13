import { creatorAuthTest as test, expect } from '../test-base';
import { buyCourseAs } from '@helpers/buyer/course-purchase';
import { listOrders } from '@helpers/api/orders';
import { countProducts, createDigitalProduct, createOnlineCourseProduct, deleteProduct, expectProductHiddenFromExplore, expectProductHideFromProfile, expectProductStatus, productSharePath, setProductStatus } from '@helpers/api/product';
import { ExplorePage } from '@pages/buyer/ExplorePage';
import { LibraryPage } from '@pages/buyer/LibraryPage';
import { ProductPurchasePage } from '@pages/buyer/ProductPurchasePage';
import { ProfilePage } from '@pages/buyer/ProfilePage';
import { baseURL } from '@config/env';
import { creatorProfile } from '@test-data/buyer/profile.data';
import { generateDigitalProductDescription, generateDigitalProductTitle, generateOnlineCourseProductData, productTypeFilterOptions, productTypeSheet, productsCreationData } from '@test-data/creator/products.creation.data';
import { productsSearchData } from '@test-data/creator/products.search.data';
import { productRowActions, productsStatusData } from '@test-data/creator/products.status.data';
import { testImages } from '@test-data/creator/post.data';
import { testAccounts } from '@test-data/users';

const tokenOf = (envVar: string) => process.env[envVar]?.replace(/"/g, '');
const creatorToken = () => tokenOf('YAPP_TEST_ACCESS_TOKEN');
const buyerToken = () => tokenOf(testAccounts.qa.envVar);
const digitalType = productTypeSheet.find((type) => type.label === 'Digital Download')!;
const courseType = productTypeSheet.find((type) => type.label === 'Online Course')!;
const consultationType = productTypeSheet.find((type) => type.label === 'Consultation')!;
const discordType = productTypeSheet.find((type) => type.label === 'Discord Membership')!;
const eventType = productTypeSheet.find((type) => type.label === 'Events and Tickets')!;
const exclusiveType = productTypeSheet.find((type) => type.label === 'Exclusive Content')!;

test.describe('Creator Products List', () => {
  test('Products — Product List, Status Grouping', {
    tag: ['@AUT-PROD-001', '@products', '@creator', '@smoke'],
    annotation: { type: 'issue', description: 'L-47' },
  }, async ({ creatorNav, productsPage, digitalProductPage, page }) => {
    test.setTimeout(240000);
    // Known bug L-47: Active names go to /products/stats, Draft names go to the editor. Last step.
    test.fail(true, 'L-47: product name links do not share one destination');
    const token = creatorToken();
    test.skip(!token, 'YAPP_TEST_ACCESS_TOKEN is required to seed a product for the list');
    if (!token) return;

    const digital = {
      title: generateDigitalProductTitle(),
      description: generateDigitalProductDescription(),
      thumbnailImagePath: testImages.hermes,
      price: 0,
      links: [{ label: 'Notes', url: 'https://example.com/notes' }],
    };
    let productUuid = '';

    try {
      await test.step('Products are grouped into Active, Inactive, and Draft', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        for (const status of productsStatusData.tabs) {
          await productsPage.selectStatusTab(status);
          await productsPage.expectStatusTabSelected(status);
          await productsPage.expectStatusTabHasProducts(status);
        }
      });

      await test.step('A product row shows its thumbnail, type, name, URL, counts, price, revenue, and status', async () => {
        await productsPage.selectStatusTab('Active');
        await productsPage.expectListColumns();
        await productsPage.searchProductsNow('Ternak Uang');
        await productsPage.expectProductRowDetails('Ternak Uang');
        await productsPage.clearSearchNow();
      });

      await test.step('Each status tab lists only products of that status', async () => {
        for (const status of productsStatusData.tabs) {
          const sample = productsStatusData.sampleProductByTab[status];
          await productsPage.selectStatusTab(status);
          await productsPage.expectListShowsOnlyRowStatus(productsStatusData.rowStatusByTab[status]);
          await productsPage.searchProductsNow(sample);
          await productsPage.expectProductVisible(sample);
          await productsPage.expectProductRowStatus(sample, productsStatusData.rowStatusByTab[status]);
          await productsPage.clearSearchNow();
        }
      });

      await test.step('SLOTS shows an empty marker, and used/total after a slot limit is saved', async () => {
        const created = await createDigitalProduct(page.request, digital, token);
        productUuid = created.productUuid;
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProductsNow('Ternak Uang');
        expect(await productsPage.readSlotsCell('Ternak Uang')).toMatch(/^[—–-]$/);
        await productsPage.searchProductsNow(digital.title);
        expect(await productsPage.readSlotsCell(digital.title)).toMatch(/^[—–-]$/);
        await productsPage.openEditProduct(digital.title);
        await digitalProductPage.openLimitedSlotStep();
        await digitalProductPage.enableLimitedSlots(4);
        await digitalProductPage.saveAndPublish();
        await creatorNav.open('products');
        await productsPage.searchProductsNow(digital.title);
        await expect.poll(async () => productsPage.readSlotsCell(digital.title), { timeout: 15000 }).toBe('0/4');
      });

      await test.step('Hiding a product from Explore keeps it on the Active tab as ACTIVE, and the menu says Unhide', async () => {
        await productsPage.hideFromExplore(digital.title, true);
        await expectProductHiddenFromExplore(page.request, productUuid, true, token);
        for (const status of productsStatusData.tabs) {
          await productsPage.selectStatusTab(status);
          if (status === 'Active') {
            await productsPage.expectProductVisible(digital.title);
            await productsPage.expectProductRowStatus(digital.title, 'ACTIVE');
          } else {
            await productsPage.expectProductHidden(digital.title);
          }
        }
        await productsPage.selectStatusTab('Active');
        await productsPage.expectMenuItem(digital.title, 'Unhide');
        await productsPage.hideFromExplore(digital.title, false);
      });

      await test.step('Every product name links to the same kind of page', async () => {
        await productsPage.clearSearchNow();
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProductsNow('Ternak Uang');
        const activeHref = await productsPage.readNameLinkPath('Ternak Uang');
        await productsPage.clearSearchNow();
        await productsPage.selectStatusTab('Draft');
        await productsPage.searchProductsNow(productsStatusData.sampleProductByTab.Draft);
        const draftHref = await productsPage.readNameLinkPath(productsStatusData.sampleProductByTab.Draft);
        const shape = (href: string) => href.replace(/[0-9a-f-]{36}/gi, ':id').replace(/\/(appointment|online-course|digital-downloads|discord-membership|events-ticket|telegram-membership)/, '/:type');
        expect(shape(activeHref)).toBe(shape(draftHref));
      });
    } finally {
      if (productUuid) await deleteProduct(page.request, productUuid, token).catch(() => undefined);
    }
  });

  test('Products — Search', {
    tag: ['@AUT-PROD-003', '@products', '@creator', '@regression'],
    annotation: { type: 'issue', description: 'L-44' },
  }, async ({ creatorNav, productsPage, page }) => {
    test.setTimeout(180000);
    // Known bug L-44: a whitespace-only search is not treated as empty. Last step.
    test.fail(true, 'L-44: a search made only of spaces returns No results instead of the full list');

    await test.step('The search field is visible and accepts focus', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.expectSearchFieldUsable();
    });

    await test.step('A product name returns only the matching rows', async () => {
      await productsPage.searchProductsNow(productsSearchData.nameQuery);
      await productsPage.expectNameSearchResults(productsSearchData.nameQuery, productsSearchData.excludedName);
    });

    await test.step('A product URL matches nothing because the list searches titles', async () => {
      // The shop list filters on title only, so a share URL is a miss.
      const productUrl = await productsPage.readMatchedProductUrl();
      await productsPage.searchProductsNow(productUrl);
      await productsPage.expectNoResultsRow();
      expect(productsSearchData.urlSearchSupported).toBe(false);
    });

    await test.step('An unknown query shows the empty row and leaves the field usable', async () => {
      await productsPage.searchProductsNow(productsSearchData.emptyQuery);
      await productsPage.expectNoResultsRow();
      await productsPage.expectSearchFieldUsable();
    });

    await test.step('Clearing the query restores the products for the selected status', async () => {
      await productsPage.clearSearchNow();
      expect(await productsPage.searchValue()).toBe('');
      expect(await productsPage.readStatusCount('Active')).toBeGreaterThan(1);
    });

    await test.step('Matching is a case-insensitive substring, padding and extra characters miss, and the query stays out of the URL', async () => {
      await productsPage.searchProductsNow('tern');
      await productsPage.expectProductVisible('Ternak Uang');
      await productsPage.searchProductsNow('TeRn');
      await productsPage.expectProductVisible('Ternak Uang');
      await productsPage.searchProductsNow(' Ternak ');
      await productsPage.expectNoResultsRow();
      await productsPage.searchProductsNow('ternak%20uang');
      await productsPage.expectNoResultsRow();
      await productsPage.searchProductsNow('ternak!');
      await productsPage.expectNoResultsRow();
      await productsPage.searchProductsNow(productsSearchData.emptyQuery);
      await productsPage.expectNoResultsRow();
      await productsPage.expectSearchKeptLocally(productsSearchData.emptyQuery);
      await productsPage.clearSearchNow();
    });

    await test.step('A search made only of spaces is treated as an empty search', async () => {
      const before = await productsPage.readStatusCounts();
      await productsPage.searchProducts('   ');
      expect(await productsPage.readStatusCounts()).toEqual(before);
      expect(await productsPage.readStatusCount('Active')).toBeGreaterThan(1);
      expect(page.url()).not.toContain('auth');
    });
  });

  test('Products — Status Tabs, Type Filter, Product Scope, Filter State', {
    tag: ['@AUT-PROD-004', '@products', '@creator', '@regression'],
    annotation: { type: 'issue', description: 'L-45' },
  }, async ({ creatorNav, productsPage, creatorFeedsPage, page }) => {
    test.setTimeout(240000);
    // Known bug L-45: status-tab counts ignore the type filter. Last step.
    test.fail(true, 'L-45: status tab counts do not reflect the type filter');
    const token = creatorToken();

    await test.step('Active, Inactive, and Draft tabs can each be selected', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      for (const status of productsStatusData.tabs) {
        await productsPage.selectStatusTab(status);
        await productsPage.expectStatusTabSelected(status);
      }
    });

    await test.step('Switching tabs shows only that status', async () => {
      for (const status of productsStatusData.tabs) {
        await productsPage.selectStatusTab(status);
        await productsPage.expectListShowsOnlyRowStatus(productsStatusData.rowStatusByTab[status]);
      }
    });

    await test.step('The count on each tab matches the number of products in that status', async () => {
      await productsPage.selectStatusTab('Active');
      const counts = await productsPage.readStatusCounts();
      expect(counts.Active).toBe(await countProducts(page.request, { status: 'active' }, token));
      expect(counts.Inactive).toBe(await countProducts(page.request, { status: 'inactive' }, token));
      expect(counts.Draft).toBe(await countProducts(page.request, { status: 'draft' }, token));
    });

    await test.step('The type filter offers every product type and a choice limits the rows to that type', async () => {
      expect(await productsPage.typeFilterLabel()).toBe('All types');
      await productsPage.expectTypeFilterOptions(productTypeFilterOptions);
      await productsPage.selectTypeFilter('Online Course');
      const types = await productsPage.visibleProductTypes();
      expect(types.length).toBeGreaterThan(0);
      for (const type of types) expect(type).toBe('Online Course');
    });

    await test.step('Digital Download and Online Course each return one type, and Digital Product returns the digital umbrella', async () => {
      await productsPage.selectTypeFilter('Digital Download');
      const downloads = await productsPage.visibleProductTypes();
      expect(downloads.length).toBeGreaterThan(0);
      for (const type of downloads) expect(type).toBe('Digital Download');
      await productsPage.selectTypeFilter('Digital Product');
      await expect(page).toHaveURL(/type=digital_product,digital_download,online_course/);
      const umbrella = await productsPage.visibleProductTypes();
      expect(umbrella.length).toBeGreaterThan(0);
      for (const type of umbrella) expect(['Digital Product', 'Digital Download', 'Online Course']).toContain(type);
      await productsPage.selectTypeFilter('Online Course');
      const courses = await productsPage.visibleProductTypes();
      expect(courses.length).toBeGreaterThan(0);
      for (const type of courses) expect(type).toBe('Online Course');
    });

    await test.step('Exclusive Content opens Feeds and is absent from the product list and the type filter', async () => {
      await creatorNav.open('products');
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(exclusiveType.buttonName);
      await creatorFeedsPage.expectLoaded();
      await expect(page).toHaveURL(/\/feeds/);
      await expect(page).not.toHaveURL(/\/products\/create/);
      await creatorNav.open('products');
      await productsPage.expectTypeFilterOptions(productTypeFilterOptions);
      await productsPage.searchProductsNow('Exclusive Content');
      await productsPage.expectNoResultsRow();
      await productsPage.clearSearchNow();
    });

    await test.step('Changing status tab keeps the type filter and the search text', async () => {
      await productsPage.selectTypeFilter('Event Ticket');
      await expect(page).toHaveURL(/type=ticket_event/);
      await productsPage.selectStatusTab('Inactive');
      expect(await productsPage.typeFilterLabel()).toBe('Event Ticket');
      await expect(page).toHaveURL(/type=ticket_event/);
      await productsPage.searchProductsNow('Ternak');
      await productsPage.selectStatusTab('Active');
      await productsPage.expectSearchKeptLocally('Ternak');
      expect(await productsPage.typeFilterLabel()).toBe('Event Ticket');
      await productsPage.clearSearchNow();
    });

    await test.step('Status tab counts follow the type filter as well as the search', async () => {
      await creatorNav.open('products');
      await productsPage.selectTypeFilter('Digital Download');
      const type = new URL(page.url()).searchParams.get('type') ?? '';
      expect(type).toBeTruthy();
      const filtered = await countProducts(page.request, { status: 'active', type }, token);
      expect(await productsPage.readStatusCount('Active')).toBe(filtered);
    });
  });

  test('Products — Product Creation — Part 1', {
    tag: ['@AUT-PROD-005', '@products', '@creator', '@regression'],
  }, async ({ creatorNav, productsPage, digitalProductPage, onlineCoursePage }) => {
    test.setTimeout(180000);

    await test.step('Add Product opens the type picker', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
    });

    await test.step('The type picker is a dialog that can be closed back to the list', async () => {
      await productsPage.expectAddProductTypes(productTypeSheet);
      await productsPage.closeAddProductSheet();
      await productsPage.expectLoaded();
    });

    await test.step('The picker groups all seven product types', async () => {
      await productsPage.openAddProductSheet();
      await productsPage.expectAddProductTypes(productTypeSheet);
    });

    await test.step('Digital Download opens its create form', async () => {
      await productsPage.selectProductType(digitalType.buttonName);
      await digitalProductPage.expectDigitalProductCreateFlow();
    });

    await test.step('Online Course opens its create form', async () => {
      await creatorNav.open('products');
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(courseType.buttonName);
      await onlineCoursePage.expectLoaded();
      await expect(onlineCoursePage.page).toHaveURL(productsCreationData.onlineCourseCreatePath);
    });
  });

  test('Products — Product Creation — Part 2', {
    tag: ['@AUT-PROD-006', '@products', '@creator', '@regression'],
  }, async ({ creatorNav, productsPage, consultationPage, discordMembershipPage, eventsPage, digitalProductPage, creatorFeedsPage, page }) => {
    test.setTimeout(240000);
    const discardedTitle = generateDigitalProductTitle();

    await test.step('Consultation opens its create form', async () => {
      await creatorNav.open('products');
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(consultationType.buttonName);
      await consultationPage.expectConsultationCreateFlow();
    });

    await test.step('Discord Membership opens its create form', async () => {
      await creatorNav.open('products');
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(discordType.buttonName);
      await discordMembershipPage.expectDiscordMembershipCreateFlow();
    });

    await test.step('Events and Tickets opens its create form', async () => {
      await creatorNav.open('products');
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(eventType.buttonName);
      await eventsPage.expectEventsCreateFlow();
    });

    await test.step('Exclusive Content opens Feeds rather than a product create form', async () => {
      await creatorNav.open('products');
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(exclusiveType.buttonName);
      await creatorFeedsPage.expectLoaded();
      await expect(page).not.toHaveURL(/\/products\/create/);
    });

    await test.step('Back from a create form drops the title, with no confirmation and no draft', async () => {
      await creatorNav.open('products');
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(consultationType.buttonName);
      await consultationPage.expectConsultationCreateFlow();
      await consultationPage.fillConsultationTitle(discardedTitle);
      await digitalProductPage.leaveViaBack();
      await productsPage.expectReturnedWithoutUnsavedPrompt();
      await productsPage.selectStatusTab('Draft');
      await productsPage.searchProductsNow(discardedTitle);
      await productsPage.expectProductHidden(discardedTitle);
    });
  });

  test('Products — Set Inactive, Reactivate', {
    tag: ['@AUT-PROD-007', '@products', '@creator', '@regression'],
  }, async ({ creatorNav, productsPage, page, browser }) => {
    test.setTimeout(360000);
    const token = creatorToken();
    const buyer = buyerToken();
    test.skip(!token || !buyer, 'Creator and QA buyer tokens are required to sell and then deactivate a product');
    if (!token || !buyer) return;

    const course = generateOnlineCourseProductData({ price: 15000, status: 'active' });
    let productUuid = '';
    let sharePath = '';
    let buyerContext: Awaited<ReturnType<typeof browser.newContext>> | null = null;

    try {
      const created = await createOnlineCourseProduct(page.request, course, token);
      productUuid = created.productUuid;
      sharePath = productSharePath(created);
      const bought = await buyCourseAs(browser, page.request, buyer, { title: course.title, sharePath });
      buyerContext = bought.context;

      await test.step('An active product offers Set Inactive', async () => {
        await creatorNav.open('products');
        await productsPage.searchProductsNow(course.title);
        await productsPage.expectProductActionMenuItems(course.title, productRowActions);
      });

      await test.step('Set Inactive moves the product to the Inactive tab without a separate Save', async () => {
        await productsPage.setProductStatusFromMenu(course.title, 'inactive');
        await expectProductStatus(page.request, productUuid, 'inactive', token);
        await productsPage.selectStatusTab('Inactive');
        await productsPage.searchProductsNow(course.title);
        await productsPage.expectProductRowStatus(course.title, 'INACTIVE');
        await productsPage.selectStatusTab('Active');
        await productsPage.expectProductHidden(course.title);
      });

      await test.step('A buyer who has not purchased cannot open the inactive product', async () => {
        const guest = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        try {
          const purchase = new ProductPurchasePage(await guest.newPage(), baseURL);
          await purchase.gotoSharePath(sharePath);
          await purchase.expectProductPageNotFound();
        } finally {
          await guest.close();
        }
      });

      await test.step('The buyer who already purchased can still open it from the library', async () => {
        const library = new LibraryPage(bought.page, baseURL);
        await library.goto();
        await library.openPurchase(course.title);
      });

      await test.step('Turning Set Inactive off publishes the product again', async () => {
        await productsPage.selectStatusTab('Inactive');
        await productsPage.expectInactiveSwitch(course.title, true);
        await productsPage.setProductStatusFromMenu(course.title, 'active');
        await expectProductStatus(page.request, productUuid, 'active', token);
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProductsNow(course.title);
        await productsPage.expectProductRowStatus(course.title, 'ACTIVE');
        const guest = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        try {
          const purchase = new ProductPurchasePage(await guest.newPage(), baseURL);
          await purchase.gotoSharePath(sharePath);
          await purchase.expectOnlineCourseProductLoaded(course.title);
          expect(await purchase.isProductPubliclyPurchasable()).toBe(true);
        } finally {
          await guest.close();
        }
      });

      await test.step('The menu switch sends the status, toasts, closes, and moves the row', async () => {
        const before = await productsPage.readStatusCounts();
        await productsPage.setProductStatusFromMenu(course.title, 'inactive');
        await expect.poll(async () => productsPage.readStatusCount('Active')).toBe(before.Active - 1);
        await productsPage.selectStatusTab('Inactive');
        await productsPage.searchProductsNow(course.title);
        await productsPage.expectInactiveSwitch(course.title, true);
        await productsPage.setProductStatusFromMenu(course.title, 'active');
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProductsNow(course.title);
        await productsPage.expectProductRowStatus(course.title, 'ACTIVE');
      });

      await test.step('An inactive product leaves the public profile and returns when activated', async () => {
        const guest = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        try {
          const profile = new ProfilePage(await guest.newPage(), baseURL);
          await profile.goto(creatorProfile);
          await profile.switchToTab('shops');
          await profile.expectProductVisibleOnShops(course.title);
          await productsPage.setProductStatusFromMenu(course.title, 'inactive');
          await profile.page.reload();
          await profile.switchToTab('shops');
          await profile.expectProductHiddenOnShops(course.title);
          await productsPage.selectStatusTab('Inactive');
          await productsPage.searchProductsNow(course.title);
          await productsPage.setProductStatusFromMenu(course.title, 'active');
          await profile.page.reload();
          await profile.switchToTab('shops');
          await profile.expectProductVisibleOnShops(course.title);
        } finally {
          await guest.close();
        }
      });
    } finally {
      await buyerContext?.close();
      if (productUuid) await deleteProduct(page.request, productUuid, token).catch(() => undefined);
    }
  });

  test('Products — Hide from Profile, Status Grouping', {
    tag: ['@AUT-PROD-008', '@products', '@creator', '@regression'],
  }, async ({ creatorNav, productsPage, page, browser }) => {
    test.setTimeout(300000);
    const token = creatorToken();
    test.skip(!token, 'YAPP_TEST_ACCESS_TOKEN is required to seed products for the actions menu');
    if (!token) return;

    const shown = generateOnlineCourseProductData({ price: 0, status: 'active' });
    const draft = generateOnlineCourseProductData({ price: 0, status: 'draft' });
    let shownId = '';
    let draftId = '';

    try {
      const created = await createOnlineCourseProduct(page.request, shown, token);
      shownId = created.productUuid;
      const sharePath = productSharePath(created);
      draftId = (await createOnlineCourseProduct(page.request, draft, token)).productUuid;

      await test.step('Hide from Profile removes it from the public profile and leaves it on Explore', async () => {
        await creatorNav.open('products');
        await productsPage.searchProductsNow(shown.title);
        await productsPage.expectHideFromProfileActionAvailable(shown.title);
        await productsPage.setHideFromProfileFromMenu(shown.title, true);
        await expectProductHideFromProfile(page.request, shownId, true, token);
        const guest = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        try {
          const profile = new ProfilePage(await guest.newPage(), baseURL);
          await profile.goto(creatorProfile);
          await profile.switchToTab('shops');
          await profile.expectProductHiddenOnShops(shown.title);
          await profile.expectProductVisibleOnShops('Ternak Uang');
          const explore = new ExplorePage(await guest.newPage(), baseURL);
          await explore.goto();
          await explore.expectProductTitleVisible(shown.title);
          const purchase = new ProductPurchasePage(await guest.newPage(), baseURL);
          await purchase.gotoSharePath(sharePath);
          await purchase.expectOnlineCourseProductLoaded(shown.title);
          expect(await purchase.isProductPubliclyPurchasable()).toBe(true);
        } finally {
          await guest.close();
        }
      });

      await test.step('Turning Hide from Profile off puts the product back on the profile', async () => {
        await productsPage.setHideFromProfileFromMenu(shown.title, false);
        await expectProductHideFromProfile(page.request, shownId, false, token);
        const guest = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        try {
          const profile = new ProfilePage(await guest.newPage(), baseURL);
          await profile.goto(creatorProfile);
          await profile.switchToTab('shops');
          await profile.expectProductVisibleOnShops(shown.title);
        } finally {
          await guest.close();
        }
      });

      await test.step('Hide removes it from Explore and leaves it on the profile', async () => {
        await creatorNav.open('products');
        await productsPage.searchProductsNow(shown.title);
        await productsPage.hideFromExplore(shown.title, true);
        await expectProductHiddenFromExplore(page.request, shownId, true, token);
        await expectProductHideFromProfile(page.request, shownId, false, token);
        await productsPage.expectMenuItem(shown.title, 'Unhide');
        const guest = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        try {
          const explore = new ExplorePage(await guest.newPage(), baseURL);
          await explore.goto();
          await explore.expectProductTitleAbsent(shown.title);
          const profile = new ProfilePage(await guest.newPage(), baseURL);
          await profile.goto(creatorProfile);
          await profile.switchToTab('shops');
          await profile.expectProductVisibleOnShops(shown.title);
          const purchase = new ProductPurchasePage(await guest.newPage(), baseURL);
          await purchase.gotoSharePath(sharePath);
          await purchase.expectOnlineCourseProductLoaded(shown.title);
          expect(await purchase.isProductPubliclyPurchasable()).toBe(true);
        } finally {
          await guest.close();
        }
        await productsPage.hideFromExplore(shown.title, false);
      });

      await test.step('Active, Inactive, and Draft share one menu, and only the inactive switch is on', async () => {
        await productsPage.expectProductActionMenuItems(shown.title, productRowActions);
        await productsPage.expectInactiveSwitch(shown.title, false);
        await setProductStatus(page.request, shownId, 'inactive', token);
        await productsPage.selectStatusTab('Inactive');
        await productsPage.searchProductsNow(shown.title);
        await productsPage.expectProductActionMenuItems(shown.title, productRowActions);
        await productsPage.expectInactiveSwitch(shown.title, true);
        await productsPage.selectStatusTab('Draft');
        await productsPage.searchProductsNow(draft.title);
        await productsPage.expectProductActionMenuItems(draft.title, productRowActions);
        await productsPage.expectInactiveSwitch(draft.title, false);
      });
    } finally {
      if (shownId) await deleteProduct(page.request, shownId, token).catch(() => undefined);
      if (draftId) await deleteProduct(page.request, draftId, token).catch(() => undefined);
    }
  });

  test('Products — Edit Product, Share Product, Hide Product', {
    tag: ['@AUT-PROD-009', '@products', '@creator', '@regression'],
  }, async ({ creatorNav, productsPage, onlineCoursePage, page, browser }) => {
    test.setTimeout(360000);
    const token = creatorToken();
    test.skip(!token, 'YAPP_TEST_ACCESS_TOKEN is required to seed a product to edit and share');
    if (!token) return;

    const course = generateOnlineCourseProductData({ price: 0, status: 'active' });
    const renamed = `${course.title} revised`;
    let productUuid = '';
    let sharePath = '';

    try {
      const created = await createOnlineCourseProduct(page.request, course, token);
      productUuid = created.productUuid;
      sharePath = productSharePath(created);

      await test.step('Edit opens the product editor', async () => {
        await creatorNav.open('products');
        await productsPage.searchProductsNow(course.title);
        await productsPage.openEditProduct(course.title);
        await onlineCoursePage.expectLoaded();
      });

      await test.step('The editor is filled with the saved product', async () => {
        await onlineCoursePage.expectEditHeader(course.title);
        await onlineCoursePage.submitContentDetails();
        await onlineCoursePage.expectTitleValue(course.title);
      });

      await test.step('A saved title change shows on the list and on the product page', async () => {
        await onlineCoursePage.fillTitle(renamed);
        await onlineCoursePage.saveCourse();
        await creatorNav.open('products');
        await productsPage.searchProductsNow(renamed);
        await productsPage.expectProductVisible(renamed);
        const guest = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        try {
          const purchase = new ProductPurchasePage(await guest.newPage(), baseURL);
          await purchase.gotoSharePath(sharePath);
          await purchase.expectOnlineCourseProductLoaded(renamed);
        } finally {
          await guest.close();
        }
      });

      await test.step('Share copies the product URL', async () => {
        await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
        await productsPage.openShareDialog(renamed);
        await productsPage.expectShareDialogVisible();
        await productsPage.copyProductUrl();
        await productsPage.expectProductUrlCopied(sharePath);
      });

      await test.step('The copied link opens this product', async () => {
        const guest = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        try {
          const purchase = new ProductPurchasePage(await guest.newPage(), baseURL);
          await purchase.gotoSharePath(sharePath);
          await purchase.expectOnlineCourseProductLoaded(renamed);
        } finally {
          await guest.close();
        }
      });

      await test.step('Hide removes the product from Explore and leaves the profile and the direct URL', async () => {
        await creatorNav.open('products');
        await productsPage.searchProductsNow(renamed);
        await productsPage.hideFromExplore(renamed, true);
        await expectProductHiddenFromExplore(page.request, productUuid, true, token);
        await productsPage.expectProductRowStatus(renamed, 'ACTIVE');
        const guest = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        try {
          const explore = new ExplorePage(await guest.newPage(), baseURL);
          await explore.goto();
          await explore.expectProductTitleAbsent(renamed);
          const profile = new ProfilePage(await guest.newPage(), baseURL);
          await profile.goto(creatorProfile);
          await profile.switchToTab('shops');
          await profile.expectProductVisibleOnShops(renamed);
          const purchase = new ProductPurchasePage(await guest.newPage(), baseURL);
          await purchase.gotoSharePath(sharePath);
          await purchase.expectOnlineCourseProductLoaded(renamed);
          expect(await purchase.isProductPubliclyPurchasable()).toBe(true);
        } finally {
          await guest.close();
        }
      });

      await test.step('Unhide puts the product back on Explore', async () => {
        await productsPage.hideFromExplore(renamed, false);
        await expectProductHiddenFromExplore(page.request, productUuid, false, token);
        await productsPage.expectMenuItem(renamed, 'Hide');
      });

      await test.step('Publish turns an inactive product back on', async () => {
        await productsPage.setProductStatusFromMenu(renamed, 'inactive');
        await onlineCoursePage.openEdit(productUuid);
        await onlineCoursePage.submitContentDetails();
        await onlineCoursePage.submitPublish();
        await expectProductStatus(page.request, productUuid, 'active', token);
        await creatorNav.open('products');
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProductsNow(renamed);
        await productsPage.expectProductRowStatus(renamed, 'ACTIVE');
      });
    } finally {
      if (productUuid) await deleteProduct(page.request, productUuid, token).catch(() => undefined);
    }
  });

  test('Products — Delete Product, Draft Visibility, Feedback, Accessibility', {
    tag: ['@AUT-PROD-010', '@products', '@creator', '@regression'],
    annotation: [
      { type: 'issue', description: 'L-52' },
      { type: 'issue', description: 'L-51' },
      { type: 'issue', description: 'L-46' },
    ],
  }, async ({ creatorNav, productsPage, onlineCoursePage, ordersPage, page, browser }) => {
    test.setTimeout(420000);
    // Known bugs, checked last: no success toast (L-52), delete dialog names nothing (L-51), icon buttons have no name (L-46).
    test.fail(true, 'L-52 / L-51 / L-46: product save and delete give no toast, the delete dialog names no product, and the row actions and copy buttons have no accessible name');
    const token = creatorToken();
    const buyer = buyerToken();
    test.skip(!token || !buyer, 'Creator and QA buyer tokens are required to purchase a product and then delete it');
    if (!token || !buyer) return;

    const course = generateOnlineCourseProductData({ price: 15000, status: 'active' });
    const draft = generateOnlineCourseProductData({ price: 0, status: 'draft' });
    let productUuid = '';
    let draftId = '';
    let buyerContext: Awaited<ReturnType<typeof browser.newContext>> | null = null;

    try {
      const created = await createOnlineCourseProduct(page.request, course, token);
      productUuid = created.productUuid;
      const sharePath = productSharePath(created);
      const bought = await buyCourseAs(browser, page.request, buyer, { title: course.title, sharePath });
      buyerContext = bought.context;
      await creatorNav.open('products');
      await productsPage.searchProductsNow(course.title);

      await test.step('Delete asks for confirmation before removing the product', async () => {
        await productsPage.openDeleteConfirmation(course.title);
        await productsPage.expectDeleteConfirmationVisible();
      });

      await test.step('Cancel leaves the product on the list and at its URL', async () => {
        await productsPage.dismissDeleteConfirmation();
        await productsPage.expectProductVisible(course.title);
        const guest = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        try {
          const purchase = new ProductPurchasePage(await guest.newPage(), baseURL);
          await purchase.gotoSharePath(sharePath);
          await purchase.expectOnlineCourseProductLoaded(course.title);
        } finally {
          await guest.close();
        }
      });

      await test.step('Confirming delete removes the product from the list and from buyers', async () => {
        await productsPage.openDeleteConfirmation(course.title);
        await productsPage.confirmDelete();
        productUuid = '';
        await productsPage.expectProductHidden(course.title);
        const guest = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        try {
          const purchase = new ProductPurchasePage(await guest.newPage(), baseURL);
          await purchase.gotoSharePath(sharePath);
          await purchase.expectProductPageNotFound();
        } finally {
          await guest.close();
        }
      });

      await test.step('The order for the deleted product stays in the orders list', async () => {
        await expect.poll(async () => (await listOrders(page.request, { limit: 20 })).data.some((order) => order.productName === course.title), { timeout: 20000 }).toBe(true);
        await creatorNav.open('orders');
        await ordersPage.expectLoaded();
        await expect.poll(async () => (await ordersPage.readRows()).some((row) => row.product === course.title), { timeout: 20000 }).toBe(true);
      });

      await test.step('A draft URL and the public profile do not offer the draft for purchase', async () => {
        const createdDraft = await createOnlineCourseProduct(page.request, draft, token);
        draftId = createdDraft.productUuid;
        const draftPath = productSharePath(createdDraft);
        const guest = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        try {
          const purchase = new ProductPurchasePage(await guest.newPage(), baseURL);
          await purchase.gotoSharePath(draftPath);
          await purchase.expectProductPageNotFound();
          const profile = new ProfilePage(await guest.newPage(), baseURL);
          await profile.goto(creatorProfile);
          await profile.switchToTab('shops');
          await profile.expectProductHiddenOnShops(draft.title);
        } finally {
          await guest.close();
        }
      });

      await test.step('The row actions button and the copy-link button have accessible names', async () => {
        await creatorNav.open('products');
        await productsPage.selectStatusTab('Draft');
        await productsPage.searchProductsNow(draft.title);
        expect.soft(await productsPage.actionsTriggerName(draft.title)).not.toBe('');
        await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
        await productsPage.openShareDialog(draft.title);
        expect.soft(await productsPage.copyLinkName()).not.toBe('');
        await page.keyboard.press('Escape');
      });

      await test.step('The delete confirmation names the product it will delete', async () => {
        await productsPage.openDeleteConfirmation(draft.title);
        expect.soft(await productsPage.deleteDialogText()).toContain(draft.title);
        await productsPage.dismissDeleteConfirmation();
      });

      await test.step('Saving and deleting a product each show a success toast', async () => {
        await productsPage.openEditProduct(draft.title);
        await onlineCoursePage.submitContentDetails();
        await onlineCoursePage.fillTitle(`${draft.title} saved`);
        await onlineCoursePage.saveCourse();
        expect.soft(await productsPage.waitForSuccessToast()).toBe(true);
        await creatorNav.open('products');
        await productsPage.selectStatusTab('Draft');
        await productsPage.searchProductsNow(`${draft.title} saved`);
        await productsPage.openDeleteConfirmation(`${draft.title} saved`);
        await productsPage.confirmDelete();
        draftId = '';
        expect.soft(await productsPage.waitForSuccessToast()).toBe(true);
      });
    } finally {
      await buyerContext?.close();
      if (productUuid) await deleteProduct(page.request, productUuid, token).catch(() => undefined);
      if (draftId) await deleteProduct(page.request, draftId, token).catch(() => undefined);
    }
  });
});
