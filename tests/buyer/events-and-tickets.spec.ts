import { authTest as test, expect } from '../test-base';
import { createEventProduct, deleteProduct } from '@helpers/api/product';
import { buyerEventsDetailData, generateBuyerEventDiscoverySeedData, generateBuyerEventSeedData } from '@test-data/buyer/events.detail.data';

test.describe('Buyer Events and Tickets', () => {
  test('Validate Event Discovery, Product Detail, and Ticket Tier Display', {
    tag: ['@AUT-FV-319', '@products', '@buyer', '@regression'],
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
          soldOutPricePattern: /IDR100,000\s*\/per pax/,
          availablePricePattern: /IDR50,000\s*\/per pax/,
          quantityPattern: /Max 100 tix\/user/,
        });
      });

      await test.step('Confirm Start From is absent from buyer event detail', async () => {
        await productPurchasePage.expectBuyerStartFromAbsent();
      });

      await test.step('Switch to About Creator and review creator information', async () => {
        await productPurchasePage.gotoSharePath(hybridEventPath);
        await productPurchasePage.expectEventAboutCreator();
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
        await productPurchasePage.expectEventDiscountedTier(/IDR130,500\s*\/per pax/);
      });

    } finally {
      await Promise.all(
        createdProducts.map((product) => deleteProduct(page.request, product.productUuid, product.token).catch(() => undefined)),
      );
    }
  });

  test('Validate Event Ticket Selection, Buyer Form, and Add to Cart', {
    tag: ['@AUT-FV-320', '@cart', '@buyer', '@smoke'],
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
          tierPrice: 'IDR10.000',
          quantityLabel: 'Ticket 1',
          attendeeName: checkout.attendeeName,
          attendeeEmail: checkout.attendeeEmail,
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

  test('Verify Owner Event View on the Public Product Page', {
    tag: ['@AUT-FV-325', '@products', '@buyer', '@regression'],
  }, async ({ productPurchasePage, page }) => {
    test.setTimeout(120000);

    const ownerSeedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!ownerSeedToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed the owner event');
    if (!ownerSeedToken) return;

    const seedData = generateBuyerEventDiscoverySeedData();
    let productUuid = '';
    let ownerEventPath = '';

    try {
      await test.step('Seed an event owned by the signed-in account via API', async () => {
        const ownerProduct = await createEventProduct(page.request, {
          title: seedData.ownerEvent.title,
          description: seedData.ownerEvent.description,
          thumbnailImagePath: seedData.thumbnailImagePath,
          eventDate: seedData.ownerEvent.eventDate,
          venueType: 'online',
          platform: 'custom',
          meetingLink: 'https://meet.google.com/owner-event',
          tickets: [seedData.ownerEvent.ticket],
        }, ownerSeedToken);
        productUuid = ownerProduct.productUuid;
        ownerEventPath = `/${ownerProduct.creatorUsername}/product/${ownerProduct.shortUrl}`;
      });

      await test.step('Open the owned event and verify Edit Product replaces the purchase actions', async () => {
        await productPurchasePage.gotoSharePath(ownerEventPath);
        await productPurchasePage.expectOwnerEventView();
      });
    } finally {
      if (productUuid) {
        await deleteProduct(page.request, productUuid, ownerSeedToken).catch(() => undefined);
      }
    }
  });

});
