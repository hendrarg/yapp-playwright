import { authTest as test, expect } from '../test-base';
import { getFeaturedCreators, getFeaturedProductTitles } from '@helpers/api/explore';
import { createEventProduct, deleteProduct } from '@helpers/api/product';
import { exploreData } from '@test-data/buyer/explore.data';
import { generateBuyerEventSeedData } from '@test-data/buyer/events.detail.data';
import { testAccounts } from '@test-data/users';

const buyerToken = () => process.env[testAccounts.qa.envVar]?.replace(/"/g, '');

test.describe('Buyer Explore', () => {
  test('Explore — Search Creators, Search Results, Creator Navigation', {
    tag: ['@AUT-EXP-001', '@explore', '@buyer', '@regression'],
  }, async ({ buyerNav, explorePage }) => {
    test.setTimeout(120000);

    await test.step('Explore shows the search bar, with no length limit', async () => {
      await buyerNav.open('explore');
      await explorePage.expectAuthenticated();
      await explorePage.expectSearchVisible();
      await explorePage.expectSearchInputUnbounded();
    });

    await test.step('Searching a display name lists the matching creator under Creators', async () => {
      await explorePage.searchCreators(exploreData.displayNameQuery);
      await explorePage.expectSearchGroups(exploreData.displayNameQuery);
      await explorePage.expectCreatorResults(exploreData.displayNameQuery, 1);
      await explorePage.expectExactCreatorResult(exploreData.creator);
    });

    await test.step('Changing the query to a username updates the results', async () => {
      await explorePage.searchCreators(exploreData.usernameQuery);
      await explorePage.expectExactCreatorResult(exploreData.creator);
    });

    await test.step('Matching is partial and case-insensitive, over three endpoints with different parameters', async () => {
      for (const variant of exploreData.caseVariants) {
        await explorePage.searchCreators(variant);
        await explorePage.expectExactCreatorResult(exploreData.creator);
      }
      await explorePage.clearSearch();
      const params = await explorePage.searchAndCaptureEndpoints(exploreData.usernameQuery);
      expect(params).toEqual(exploreData.searchParams);
    });

    await test.step('A creator result opens that creator profile', async () => {
      await explorePage.openSearchCreator(exploreData.creator.href);
    });
  });

  test('Explore — Search Results, Creators For You, Global Search Result Scope, Search State Reset', {
    tag: ['@AUT-EXP-002', '@explore', '@buyer', '@regression'],
  }, async ({ buyerNav, explorePage, page }) => {
    test.setTimeout(120000);
    const featured = await getFeaturedCreators(page.request, buyerToken());

    await test.step('A query with no creator match shows the empty state of every result group', async () => {
      await buyerNav.open('explore');
      await explorePage.searchCreators(exploreData.noMatchQuery);
      await explorePage.expectSearchGroups(exploreData.noMatchQuery);
      await explorePage.expectAllGroupsEmpty(exploreData.noMatchQuery);
    });

    await test.step('Global search keeps the query in the URL after a reload and groups the results', async () => {
      await explorePage.searchCreators(exploreData.displayNameQuery);
      await page.reload();
      await explorePage.expectSearchGroups(exploreData.displayNameQuery);
      await explorePage.expectExactCreatorResult(exploreData.creator);
    });

    await test.step('Clearing the query restores the default Explore sections', async () => {
      await explorePage.clearSearch();
      await explorePage.expectDefaultSections();
    });

    await test.step('Creators For You lists the featured creators with avatar, name and username', async () => {
      expect(featured.length, 'featured creators').toBeGreaterThan(0);
      await explorePage.expectRecommendedCreators(featured.slice(0, 4).map((c) => ({ name: c.name, username: `@${c.username}` })));
    });

    await test.step('A Creators For You card opens that creator profile', async () => {
      await explorePage.openRecommendedCreator({ name: featured[0].name, href: `/${featured[0].username}` });
      await explorePage.returnToExplore();
    });

    await test.step('See More opens the full creator list', async () => {
      await explorePage.openAllCreators();
    });
  });

  test('Explore — Popular Products, Popular Product Card, Popularity Ranking, Product Navigation, Public Discovery Eligibility, Card Metadata Consistency', {
    tag: ['@AUT-EXP-003', '@explore', '@buyer', '@smoke'],
    annotation: { type: 'issue', description: 'L-12' },
  }, async ({ buyerNav, explorePage, page }) => {
    test.setTimeout(240000);
    // Known bug L-12: Popular cards drop the product-type badge that Recommended cards show.
    test.fail(true, 'L-12: product card fields differ between Popular Products and Recommended');
    const seedToken = process.env[testAccounts.sundanese.envVar]?.replace(/"/g, '');
    test.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN_2 is required to seed a past event');
    if (!seedToken) return;
    const curated = await getFeaturedProductTitles(page.request, buyerToken());
    let products!: Awaited<ReturnType<typeof explorePage.getVisibleProducts>>;
    let pastEventUuid = '';

    try {
      await test.step('Popular Products is shown with complete product cards', async () => {
        await buyerNav.open('explore');
        await explorePage.expectAuthenticated();
        await explorePage.expectProductSections();
        await explorePage.expectProductCardMetadata([explorePage.popularGrid]);
        products = await explorePage.getVisibleProducts();
      });

      await test.step('Popular Products follow the curated order', async () => {
        await explorePage.expectPopularOrder(curated);
      });

      await test.step('Only publicly discoverable products are shown', async () => {
        await explorePage.expectProductsInPublicList(products);
      });

      await test.step('A popular product opens its product page', async () => {
        await explorePage.openProductFromEachSection(products);
      });

      await test.step('See More opens the full product catalogue', async () => {
        await explorePage.openAllProducts();
        await explorePage.expectPaidAndFreeProducts();
        await explorePage.returnToExplore();
      });

      await test.step('A product renders the same card fields in every Explore section', async () => {
        await explorePage.expectConsistentCardsAcrossSections(exploreData.productTypeLabels);
      });

      await test.step('A past event is left out of every Explore discovery surface', async () => {
        const event = generateBuyerEventSeedData();
        const title = `Past event ${Date.now()}`;
        const past = new Date(Date.now() - 3 * 86400000);
        const ddmmyyyy = `${String(past.getDate()).padStart(2, '0')}-${String(past.getMonth() + 1).padStart(2, '0')}-${past.getFullYear()}`;
        pastEventUuid = (await createEventProduct(page.request, {
          title, description: event.description, thumbnailImagePath: event.thumbnailImagePath, eventDate: ddmmyyyy,
          venueType: 'online', platform: 'custom', meetingLink: event.meetingLink,
          tickets: [{ ...event.onlineTier, periodStart: new Date(Date.now() - 10 * 86400000).toISOString(), periodEnd: new Date(Date.now() - 4 * 86400000).toISOString() }],
        }, seedToken)).productUuid;
        await explorePage.expectGlobalSearchFindsProduct(title, false);
        await explorePage.returnToExplore();
        await explorePage.selectProductCategory('Events and Tickets', 'ticket_event');
        expect(await explorePage.recommendedContains(title), 'Recommended (Events) lists the past event').toBe(false);
        expect(await explorePage.catalogueSearchFinds(title), 'the /explore/products catalogue lists the past event').toBe(false);
      });
    } finally {
      if (pastEventUuid) await deleteProduct(page.request, pastEventUuid, seedToken).catch(() => undefined);
    }
  });

  test('Explore — Recommended Products, Recommended Product Card, Product Navigation, Product Category Filter', {
    tag: ['@AUT-EXP-004', '@explore', '@buyer', '@regression'],
  }, async ({ buyerNav, explorePage }) => {
    test.setTimeout(120000);
    const { categoryFilter } = exploreData;

    await test.step('Recommended is shown with complete product cards', async () => {
      await buyerNav.open('explore');
      await explorePage.expectRecommendedSectionVisible();
      await explorePage.expectProductCardMetadata([explorePage.recommendedGrid]);
    });

    await test.step('A recommended product opens its product page', async () => {
      const [first] = await explorePage.getRecommendedProducts();
      await explorePage.openRecommendedProduct(first);
      await explorePage.returnToExplore();
    });

    await test.step('A category chip filters Recommended and All restores it', async () => {
      await explorePage.selectProductCategory(categoryFilter.label, categoryFilter.query);
      await explorePage.expectRecommendedOnlyType(categoryFilter.badge);
      await explorePage.clearProductCategory();
    });
  });
});
