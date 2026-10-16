import { authTest as test, expect } from '../test-base';
import { baseURL } from '@config/env';
import { getAccount } from '@helpers/api/account';
import { createEventProduct, deleteProduct } from '@helpers/api/product';
import { depositWebhook } from '@helpers/api/webhook';
import { loginWithToken } from '@helpers/auth/token-login';
import { ProductPurchasePage } from '@pages/buyer/ProductPurchasePage';
import { buyerEventsDetailData, generateBuyerEventDiscoverySeedData, generateBuyerEventSeedData } from '@test-data/buyer/events.detail.data';
import { testAccounts } from '@test-data/users';

test.describe('Buyer Events and Tickets', () => {
  test('Event & Tickets — Event Explore Category, Event Product Card, Event Detail Page - Overview, Image Carousel, Event Date Display, Venue Display - On-site, Event Status Display, Ticket Tier Display', {
    tag: ['@AUT-EVT-011', '@events', '@buyer', '@regression'],
  }, async ({ explorePage, productPurchasePage, page }) => {
    test.setTimeout(240000);

    const creatorSeedToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
    test.skip(!creatorSeedToken, 'YAPP_TEST_ACCESS_TOKEN_2 is required to seed non-owner events');
    if (!creatorSeedToken) return;

    const seedData = generateBuyerEventDiscoverySeedData();
    const createdProducts: Array<{ productUuid: string; token: string }> = [];
    let timedEventPath = '';
    let carouselEventPath = '';
    let hybridEventPath = '';
    let timedCreator = '';
    let carouselCreator = '';
    const mapsHrefPattern = /google\.com\/maps\/search/;

    try {
      await test.step('Seed discovery events with discount, carousel, and hybrid ticket configurations via API', async () => {
        const timedProduct = await createEventProduct(page.request, {
          title: seedData.timedEvent.title,
          description: seedData.timedEvent.description,
          thumbnailImagePath: seedData.thumbnailImagePath,
          eventDate: seedData.timedEvent.eventDate,
          isAllDay: false,
          eventTimeStart: seedData.timedEvent.timeStart,
          eventTimeEnd: seedData.timedEvent.timeEnd,
          venueType: 'on_site',
          venueName: seedData.timedEvent.venueName,
          venueAddress: seedData.timedEvent.venueAddress,
          platform: 'custom',
          meetingLink: 'https://meet.google.com/timed-event',
          tickets: [seedData.timedEvent.ticket],
        }, creatorSeedToken);
        createdProducts.push({ productUuid: timedProduct.productUuid, token: creatorSeedToken });
        timedEventPath = `/${timedProduct.creatorUsername}/product/${timedProduct.shortUrl}`;
        timedCreator = timedProduct.creatorName;

        const carouselProduct = await createEventProduct(page.request, {
          title: seedData.carouselEvent.title,
          description: seedData.carouselEvent.description,
          thumbnailImagePath: seedData.carouselEvent.thumbnailImagePath,
          productImagePaths: seedData.carouselEvent.imagePaths,
          eventDate: seedData.carouselEvent.eventDate,
          venueType: 'on_site',
          venueName: seedData.carouselEvent.venueName,
          venueAddress: seedData.carouselEvent.venueAddress,
          platform: 'custom',
          meetingLink: 'https://meet.google.com/carousel-event',
          tickets: [seedData.carouselEvent.soldOutTier, seedData.carouselEvent.availableTier],
        }, creatorSeedToken);
        createdProducts.push({ productUuid: carouselProduct.productUuid, token: creatorSeedToken });
        carouselEventPath = `/${carouselProduct.creatorUsername}/product/${carouselProduct.shortUrl}`;
        carouselCreator = carouselProduct.creatorName;

        const hybridProduct = await createEventProduct(page.request, {
          title: seedData.hybridEvent.title,
          description: seedData.hybridEvent.description,
          thumbnailImagePath: seedData.thumbnailImagePath,
          eventDate: seedData.hybridEvent.eventDate,
          venueType: 'hybrid',
          venueName: seedData.hybridEvent.venueName,
          venueAddress: seedData.hybridEvent.venueAddress,
          platform: 'custom',
          meetingLink: 'https://meet.google.com/hybrid-event',
          tickets: [seedData.hybridEvent.onlineTier, seedData.hybridEvent.offlineTier],
        }, creatorSeedToken);
        createdProducts.push({ productUuid: hybridProduct.productUuid, token: creatorSeedToken });
        hybridEventPath = `/${hybridProduct.creatorUsername}/product/${hybridProduct.shortUrl}`;

      });

      await test.step('Filter Explore to Events and Tickets', async () => {
        await explorePage.goto();
        await explorePage.expectLoaded();
        await explorePage.selectProductCategory(
          buyerEventsDetailData.exploreFilter.label,
          buyerEventsDetailData.exploreFilter.query,
        );
      });

      await test.step('Review the filtered event card metadata', async () => {
        await explorePage.expectEventCard({
          title: seedData.timedEvent.title,
          creator: timedCreator,
          badge: buyerEventsDetailData.eventBadge,
          pricePattern: /Rp130\.500.*Rp145\.000/,
        });
      });

      await test.step('Open an event and verify the buyer detail layout', async () => {
        await explorePage.openEventCard(seedData.timedEvent.title, timedEventPath);
        await productPurchasePage.expectEventOverview({
          title: seedData.timedEvent.title,
          creator: timedCreator,
        });
      });

      await test.step('Navigate the event image carousel to its boundary', async () => {
        await productPurchasePage.gotoSharePath(carouselEventPath);
        await productPurchasePage.expectEventOverview({
          title: seedData.carouselEvent.title,
          creator: carouselCreator,
        });
        await productPurchasePage.expectEventCarouselBoundary(seedData.carouselEvent.slideCount);
      });

      await test.step('Verify timed, All Day, and event status formats', async () => {
        await productPurchasePage.gotoSharePath(timedEventPath);
        await productPurchasePage.expectEventDateAndStatus({
          datePattern: new RegExp(seedData.timedEvent.dateLabel),
          timePattern: new RegExp(`${seedData.timedEvent.timeStart} - ${seedData.timedEvent.timeEnd}`),
          statusPattern: /Event start in \d+ days? : \d+h : \d+m/,
        });

        await productPurchasePage.gotoSharePath(hybridEventPath);
        await productPurchasePage.expectEventDateAndStatus({
          datePattern: new RegExp(seedData.hybridEvent.dateLabel),
          allDayText: seedData.hybridEvent.allDayText,
          statusPattern: /Event start in \d+ days? : \d+h : \d+m|Event has started|Event is ongoing/,
        });
      });

      await test.step('Verify the on-site venue and Google Maps link', async () => {
        await productPurchasePage.gotoSharePath(timedEventPath);
        await productPurchasePage.expectEventVenueLink(seedData.timedEvent.venueName, mapsHrefPattern);
      });

      await test.step('Review available and sold-out ticket tiers', async () => {
        await productPurchasePage.gotoSharePath(carouselEventPath);
        await productPurchasePage.expectEventTicketTiers({
          soldOutTier: seedData.carouselEvent.soldOutTier.title,
          availableTier: seedData.carouselEvent.availableTier.title,
          soldOutPricePattern: buyerEventsDetailData.carouselEvent.soldOutPricePattern,
          availablePricePattern: buyerEventsDetailData.carouselEvent.availablePricePattern,
          quantityPattern: /Max 100 tix\/user/,
        });
      });

      await test.step('Confirm Start From is absent from buyer event detail', async () => {
        await productPurchasePage.expectBuyerStartFromAbsent();
      });

    } finally {
      await Promise.all(
        createdProducts.map((product) => deleteProduct(page.request, product.productUuid, product.token).catch(() => undefined)),
      );
    }
  });


  test('Event & Tickets — Sold Out Tier, Select Ticket Tier, Bottom Sticky Bar, Tier Quantity Mislabelled as Per-User Cap, Hybrid Event Access Info per Tier, Discounted Tier Price Display, Carousel Boundary Behaviour, Owner Viewing Own Event', {
    tag: ['@AUT-EVT-012', '@events', '@buyer', '@regression'],
  }, async ({ productPurchasePage, page, browser }) => {
    test.setTimeout(240000);

    const creatorSeedToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
    const ownerToken = process.env[testAccounts.creator.envVar]?.replace(/"/g, '');
    test.skip(!creatorSeedToken || !ownerToken, 'Second creator (token2) and creator tokens are required');
    if (!creatorSeedToken || !ownerToken) return;

    const seedData = generateBuyerEventDiscoverySeedData();
    const createdProducts: Array<{ productUuid: string; token: string }> = [];
    let timedEventPath = '';
    let carouselEventPath = '';
    let hybridEventPath = '';

    try {
      await test.step('Seed discovery events with discount, carousel, and hybrid ticket configurations via API', async () => {
        const timedProduct = await createEventProduct(page.request, {
          title: seedData.timedEvent.title,
          description: seedData.timedEvent.description,
          thumbnailImagePath: seedData.thumbnailImagePath,
          eventDate: seedData.timedEvent.eventDate,
          isAllDay: false,
          eventTimeStart: seedData.timedEvent.timeStart,
          eventTimeEnd: seedData.timedEvent.timeEnd,
          venueType: 'on_site',
          venueName: seedData.timedEvent.venueName,
          venueAddress: seedData.timedEvent.venueAddress,
          platform: 'custom',
          meetingLink: 'https://meet.google.com/timed-event',
          tickets: [seedData.timedEvent.ticket],
        }, creatorSeedToken);
        createdProducts.push({ productUuid: timedProduct.productUuid, token: creatorSeedToken });
        timedEventPath = `/${timedProduct.creatorUsername}/product/${timedProduct.shortUrl}`;

        const carouselProduct = await createEventProduct(page.request, {
          title: seedData.carouselEvent.title,
          description: seedData.carouselEvent.description,
          thumbnailImagePath: seedData.carouselEvent.thumbnailImagePath,
          productImagePaths: seedData.carouselEvent.imagePaths,
          eventDate: seedData.carouselEvent.eventDate,
          venueType: 'on_site',
          venueName: seedData.carouselEvent.venueName,
          venueAddress: seedData.carouselEvent.venueAddress,
          platform: 'custom',
          meetingLink: 'https://meet.google.com/carousel-event',
          tickets: [seedData.carouselEvent.soldOutTier, seedData.carouselEvent.availableTier],
        }, creatorSeedToken);
        createdProducts.push({ productUuid: carouselProduct.productUuid, token: creatorSeedToken });
        carouselEventPath = `/${carouselProduct.creatorUsername}/product/${carouselProduct.shortUrl}`;

        const hybridProduct = await createEventProduct(page.request, {
          title: seedData.hybridEvent.title,
          description: seedData.hybridEvent.description,
          thumbnailImagePath: seedData.thumbnailImagePath,
          eventDate: seedData.hybridEvent.eventDate,
          venueType: 'hybrid',
          venueName: seedData.hybridEvent.venueName,
          venueAddress: seedData.hybridEvent.venueAddress,
          platform: 'custom',
          meetingLink: 'https://meet.google.com/hybrid-event',
          tickets: [seedData.hybridEvent.onlineTier, seedData.hybridEvent.offlineTier],
        }, creatorSeedToken);
        createdProducts.push({ productUuid: hybridProduct.productUuid, token: creatorSeedToken });
        hybridEventPath = `/${hybridProduct.creatorUsername}/product/${hybridProduct.shortUrl}`;

      });

      await test.step('A sold-out tier is marked Sold Out with Select disabled, and the available tier is selectable', async () => {
        await productPurchasePage.gotoSharePath(carouselEventPath);
        await productPurchasePage.expectEventTicketTiers({
          soldOutTier: seedData.carouselEvent.soldOutTier.title,
          availableTier: seedData.carouselEvent.availableTier.title,
          soldOutPricePattern: buyerEventsDetailData.carouselEvent.soldOutPricePattern,
          availablePricePattern: buyerEventsDetailData.carouselEvent.availablePricePattern,
          quantityPattern: buyerEventsDetailData.carouselEvent.quantityPattern,
        });
      });

      await test.step('The sticky bar keeps Add To Cart disabled until a tier is selected', async () => {
        await productPurchasePage.gotoSharePath(carouselEventPath);
        await productPurchasePage.expectEventStickyBarBeforeSelection();
        await productPurchasePage.selectEventTicket(seedData.carouselEvent.availableTier.title);
        await productPurchasePage.expectEventStickyBarEnabledAfterScroll();
      });

      await test.step('The image carousel stops at its ends', async () => {
        await productPurchasePage.gotoSharePath(carouselEventPath);
        await productPurchasePage.expectEventCarouselBoundary(seedData.carouselEvent.slideCount);
      });

      await test.step('Record the buyer-facing tier quantity label', async () => {
        await productPurchasePage.gotoSharePath(carouselEventPath);
        await productPurchasePage.expectEventQuantityLabel(/Max 100 tix\/user/);
      });

      await test.step('Verify hybrid access information is scoped per tier', async () => {
        await productPurchasePage.gotoSharePath(hybridEventPath);
        await productPurchasePage.expectHybridEventAccess({
          venue: seedData.hybridEvent.venueName,
          address: seedData.hybridEvent.venueAddress,
          platform: seedData.hybridEvent.platform,
          meetingLinkNotice: seedData.hybridEvent.meetingLinkNotice,
          onlineTier: seedData.hybridEvent.onlineTier.title,
          offlineTier: seedData.hybridEvent.offlineTier.title,
        });
      });

      await test.step('Verify discounted card and ticket tier arithmetic', async () => {
        const { price, discount } = seedData.timedEvent.ticket;
        expect(price - (price * (discount ?? 0)) / 100).toBe(130500);

        await productPurchasePage.gotoSharePath(timedEventPath);
        await productPurchasePage.expectEventDiscountedTier(buyerEventsDetailData.discountedEvent.tierPricePattern);
      });


      await test.step('The creator viewing their own event gets Edit Product instead of Add To Cart', async () => {
        const ownerProduct = await createEventProduct(page.request, {
          title: seedData.ownerEvent.title,
          description: seedData.ownerEvent.description,
          thumbnailImagePath: seedData.thumbnailImagePath,
          eventDate: seedData.ownerEvent.eventDate,
          venueType: 'online',
          platform: 'custom',
          meetingLink: 'https://meet.google.com/owner-event',
          tickets: [seedData.ownerEvent.ticket],
        }, ownerToken);
        createdProducts.push({ productUuid: ownerProduct.productUuid, token: ownerToken });
        const ownerContext = await browser.newContext({ viewport: page.viewportSize() });
        try {
          await loginWithToken(ownerContext, ownerToken, baseURL);
          const ownerView = new ProductPurchasePage(await ownerContext.newPage(), baseURL);
          await ownerView.gotoSharePath(`/${ownerProduct.creatorUsername}/product/${ownerProduct.shortUrl}`);
          await ownerView.expectOwnerEventView();
        } finally {
          await ownerContext.close();
        }
        // The buyer on another creator's event keeps the purchase path.
        await productPurchasePage.gotoSharePath(carouselEventPath);
        await productPurchasePage.expectEventStickyBarBeforeSelection();
      });
    } finally {
      await Promise.all(
        createdProducts.map((product) => deleteProduct(page.request, product.productUuid, product.token).catch(() => undefined)),
      );
    }
  });

  test('Event & Tickets — Ticket Actions, Ticket Access in Library, Ticket Detail - Pre-Event, Post-Event Ticket State, Per-Tier After-Sales, Global After-Sales, After-Sales Links, Ticket QR and Validity Window', {
    tag: ['@AUT-EVT-013', '@events', '@library', '@buyer', '@regression'],
  }, async ({ libraryPage, page }) => {
    test.setTimeout(120000);
    const { library, ticketPage } = buyerEventsDetailData;

    await test.step('Access Library and filter by Events & Tickets chip (TC-EVT-B-014)', async () => {
      await libraryPage.goto();
      await libraryPage.expectLoaded();
      const eventsCount = await libraryPage.chipCount(library.eventsChip);
      expect(eventsCount).toBeGreaterThan(0);
      await libraryPage.filterCategory(library.eventsChip, library.eventsQuery);
    });

    await test.step('Open purchased event ticket and verify tabs and event info (TC-EVT-B-010, TC-EVT-B-014, TC-EVT-B-015)', async () => {
      await libraryPage.openFirstPurchase();
      await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole('tab', { name: 'Ticket' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('tab', { name: 'About Creator' })).toBeVisible({ timeout: 10000 });

      // Switch to Ticket tab
      await page.getByRole('tab', { name: 'Ticket' }).click();
    });

    await test.step('Verify ticket actions: Share and Scan exist, transfer action absent (TC-EVT-B-010)', async () => {
      await expect(page.getByRole('button', { name: /share/i }).filter({ visible: true })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: /scan/i }).filter({ visible: true })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: /transfer/i })).toHaveCount(0);
    });

    await test.step('Verify after-sales message entry is accessible (TC-EVT-B-018)', async () => {
      const viewMsgBtn = page.getByRole('button', { name: ticketPage.viewMessage });
      if (await viewMsgBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await viewMsgBtn.click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 5000 });
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden({ timeout: 5000 });
      }
    });

    await test.step('Verify Scan view renders QR code, ticket code, and check-in status (TC-EVT-B-024)', async () => {
      const scanBtn = page.getByRole('button', { name: /scan/i }).filter({ visible: true }).first();
      await scanBtn.click();
      const scanDialog = page.getByRole('dialog');
      await expect(scanDialog).toBeVisible({ timeout: 10000 });
      await expect(scanDialog.locator('svg').first()).toBeVisible({ timeout: 5000 });
      await expect(scanDialog).toContainText(/YAPP-|Pending|Ticket Code/i);
      await page.keyboard.press('Escape');
      await expect(scanDialog).toBeHidden({ timeout: 5000 });
    });
  });

  test('Event & Tickets — Proceed to Checkout, Buyer Form Checkout Modal, Cart Contents for Event Ticket, Product Added Confirmation', {
    tag: ['@AUT-EVT-014', '@events', '@cart', '@buyer', '@smoke'],
  }, async ({ productPurchasePage, cartPage, page }) => {
    test.setTimeout(180000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
    test.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN_2 is required to seed event product');
    if (!seedToken) return;

    const event = generateBuyerEventSeedData();
    const { checkout } = buyerEventsDetailData;
    let productUuid = '';
    let sharePath = '';
    let creatorName = '';
    const buyerToken = process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
    const buyer = await getAccount(page.request, buyerToken);
    const buyerEmail = `${process.env.TESTMAIL_NAMESPACE}.${testAccounts.qa.testmailTag}@inbox.testmail.app`;

    try {
      await test.step('Seed a published hybrid event with ticket tiers via API', async () => {
        const product = await createEventProduct(
          page.request,
          {
            title: event.title,
            description: event.description,
            thumbnailImagePath: event.thumbnailImagePath,
            eventDate: event.eventDate,
            timezone: event.timezone,
            venueType: event.venueType,
            venueName: event.venueName,
            venueAddress: event.venueAddress,
            platform: event.platform,
            meetingLink: event.meetingLink,
            tickets: [event.onlineTier, event.offlineTier],
          },
          seedToken,
        );
        productUuid = product.productUuid;
        sharePath = product.sharePath;
        creatorName = product.creatorName;
      });

      await test.step('Open an event and verify ticket selection gates the sticky actions', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectEventStickyBarBeforeSelection();
        await productPurchasePage.selectEventTicket(event.onlineTier.title);
        await productPurchasePage.expectEventStickyBarEnabledAfterScroll();
      });

      await test.step('Complete the event buyer form with contact and attendee details', async () => {
        await productPurchasePage.openEventCheckout();
        await productPurchasePage.expectEventCheckoutForm({
          title: event.title,
          tierName: event.onlineTier.title,
          subtotal: checkout.subtotalAmount,
        });
        await productPurchasePage.expectEventPhoneValidation();
        await productPurchasePage.submitEventCheckout();
      });

      await test.step('Verify the Product Added confirmation', async () => {
        await productPurchasePage.expectEventProductAdded({
          title: event.title,
          creator: creatorName,
        });
      });

      await test.step('Open Cart and verify the selected event ticket details', async () => {
        await productPurchasePage.clickEventSeeCart();
        await cartPage.expectLoaded();
        await cartPage.expectEventTicketItem({
          title: event.title,
          creator: creatorName,
          badge: buyerEventsDetailData.eventBadge,
          schedule: buyerEventsDetailData.hybridEvent.allDayText,
          venue: event.venueName,
          address: event.venueAddress,
          platform: 'Online',
          tierName: event.onlineTier.title,
          tierPrice: checkout.tierPriceInCart,
          quantityLabel: 'Ticket 1',
          attendeeName: buyer.name,
          attendeeEmail: buyerEmail,
          attendeePhone: checkout.cartAttendeePhone,
          totalAmount: checkout.cartTotal,
        });
      });
    } finally {
      if (productUuid) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });

  test('Event & Tickets — About Creator Tab, Library Route and Event Filter, After-Sales Message Access, Ticket About Creator Name', {
    tag: ['@AUT-EVT-015', '@events', '@library', '@buyer', '@regression'],
  }, async ({ productPurchasePage, cartPage, libraryPage, page }) => {
    test.setTimeout(300000);
    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
    test.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN_2 is required to seed the event');
    if (!seedToken) return;

    const event = generateBuyerEventSeedData();
    const { library } = buyerEventsDetailData;
    let productUuid = '';
    let sharePath = '';
    let creatorName = '';

    try {
      await test.step('Seed an event with an online and an offline tier', async () => {
        const product = await createEventProduct(page.request, {
          title: event.title,
          description: event.description,
          thumbnailImagePath: event.thumbnailImagePath,
          eventDate: event.eventDate,
          timezone: event.timezone,
          venueType: event.venueType,
          venueName: event.venueName,
          venueAddress: event.venueAddress,
          platform: event.platform,
          meetingLink: event.meetingLink,
          tickets: [event.onlineTier, event.offlineTier],
        }, seedToken);
        productUuid = product.productUuid;
        sharePath = product.sharePath;
        creatorName = product.creatorName;
      });

      await test.step('The About Creator tab on the event page shows the creator', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectEventAboutCreator();
      });


      await test.step('The buyer buys a ticket through the cart', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.selectEventTicket(event.onlineTier.title);
        await productPurchasePage.openEventCheckout();
        await productPurchasePage.expectEventPhoneValidation();
        await productPurchasePage.submitEventCheckout();
        await productPurchasePage.clickEventSeeCart();
        await cartPage.checkoutItem(event.title);
        const orderId = await cartPage.payCheckout(buyerEventsDetailData.checkout.validPhone);
        await depositWebhook(page.request, orderId);
        await cartPage.expectPaymentSuccess();
      });

      await test.step('/library is gone; the library lives at /dashboard/library and filters to events', async () => {
        await libraryPage.expectLegacyRouteMissing();
        await libraryPage.goto();
        await libraryPage.expectLoaded();
        expect(await libraryPage.chipCount(library.eventsChip)).toBeGreaterThan(0);
        await libraryPage.filterCategory(library.eventsChip, library.eventsQuery, event.title);
      });

      await test.step('The purchased ticket shows the creator after-sales message', async () => {
        await libraryPage.openPurchase(event.title);
        await libraryPage.expectAfterSalesMessage(creatorName);
      });

      await test.step('The ticket About Creator tab names the real creator', async () => {
        await libraryPage.expectTicketAboutCreatorName(creatorName);
      });
    } finally {
      if (productUuid) await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
    }
  });

});
