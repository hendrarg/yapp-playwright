import { authTest as test, expect } from '../test-base';
import { buyerEventsDetailData } from '@test-data/buyer/events.detail.data';

test.describe('Buyer Events and Tickets', () => {
  test('Validate Event Discovery, Product Detail, and Ticket Tier Display', {
    tag: ['@AUT-FV-319', '@products', '@buyer', '@regression'],
  }, async ({ explorePage, productPurchasePage }) => {
    test.setTimeout(180000);

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
        title: buyerEventsDetailData.discountedEvent.title,
        creator: buyerEventsDetailData.discountedEvent.creator,
        badge: buyerEventsDetailData.eventBadge,
        pricePattern: buyerEventsDetailData.discountedEvent.cardPricePattern,
      });
    });

    await test.step('Open an event and verify the buyer detail layout', async () => {
      await explorePage.openEventCard(
        buyerEventsDetailData.discountedEvent.title,
        buyerEventsDetailData.discountedEvent.path,
      );
      await productPurchasePage.expectEventOverview({
        title: buyerEventsDetailData.discountedEvent.title,
        creator: buyerEventsDetailData.discountedEvent.creator,
      });
    });

    await test.step('Navigate the event image carousel to its boundary', async () => {
      await productPurchasePage.gotoSharePath(buyerEventsDetailData.carouselEvent.path);
      await productPurchasePage.expectEventOverview({
        title: buyerEventsDetailData.carouselEvent.title,
        creator: buyerEventsDetailData.carouselEvent.creator,
      });
      await productPurchasePage.expectEventCarouselBoundary(buyerEventsDetailData.carouselEvent.slideCount);
    });

    await test.step('Verify timed, All Day, and event status formats', async () => {
      await productPurchasePage.gotoSharePath(buyerEventsDetailData.discountedEvent.path);
      await productPurchasePage.expectEventDateAndStatus({
        datePattern: buyerEventsDetailData.discountedEvent.datePattern,
        timePattern: buyerEventsDetailData.discountedEvent.timePattern,
        statusPattern: buyerEventsDetailData.discountedEvent.countdownPattern,
      });

      await productPurchasePage.gotoSharePath(buyerEventsDetailData.hybridEvent.path);
      await productPurchasePage.expectEventDateAndStatus({
        datePattern: buyerEventsDetailData.hybridEvent.datePattern,
        allDayText: buyerEventsDetailData.hybridEvent.allDayText,
        statusPattern: /Event start in \d+ days? : \d+h : \d+m|Event has started|Event is ongoing/,
      });
    });

    await test.step('Verify the on-site venue and Google Maps link', async () => {
      await productPurchasePage.gotoSharePath(buyerEventsDetailData.discountedEvent.path);
      await productPurchasePage.expectEventVenueLink(
        buyerEventsDetailData.discountedEvent.venue,
        buyerEventsDetailData.discountedEvent.mapsHref,
      );
    });

    await test.step('Verify future and started event status copy', async () => {
      await productPurchasePage.expectEventDateAndStatus({
        datePattern: buyerEventsDetailData.discountedEvent.datePattern,
        timePattern: buyerEventsDetailData.discountedEvent.timePattern,
        statusPattern: buyerEventsDetailData.discountedEvent.countdownPattern,
      });
    });

    await test.step('Review available and sold-out ticket tiers', async () => {
      await productPurchasePage.gotoSharePath(buyerEventsDetailData.carouselEvent.path);
      await productPurchasePage.expectEventTicketTiers({
        soldOutTier: buyerEventsDetailData.carouselEvent.soldOutTier,
        availableTier: buyerEventsDetailData.carouselEvent.availableTier,
        soldOutPricePattern: buyerEventsDetailData.carouselEvent.soldOutPricePattern,
        availablePricePattern: buyerEventsDetailData.carouselEvent.availablePricePattern,
        quantityPattern: buyerEventsDetailData.carouselEvent.quantityPattern,
      });
    });

    await test.step('Confirm Start From is absent from buyer event detail', async () => {
      await productPurchasePage.expectBuyerStartFromAbsent();
    });

    await test.step('Switch to About Creator and review creator information', async () => {
      await productPurchasePage.gotoSharePath(buyerEventsDetailData.hybridEvent.path);
      await productPurchasePage.expectEventAboutCreator();
    });

    await test.step('Record the buyer-facing tier quantity label', async () => {
      await productPurchasePage.gotoSharePath(buyerEventsDetailData.carouselEvent.path);
      await productPurchasePage.expectEventQuantityLabel(buyerEventsDetailData.carouselEvent.quantityPattern);
    });

    await test.step('Verify hybrid access information is scoped per tier', async () => {
      await productPurchasePage.gotoSharePath(buyerEventsDetailData.hybridEvent.path);
      await productPurchasePage.expectHybridEventAccess({
        venue: buyerEventsDetailData.hybridEvent.venue,
        address: buyerEventsDetailData.hybridEvent.address,
        platform: buyerEventsDetailData.hybridEvent.platform,
        meetingLinkNotice: buyerEventsDetailData.hybridEvent.meetingLinkNotice,
        onlineTier: buyerEventsDetailData.hybridEvent.onlineTier,
        offlineTier: buyerEventsDetailData.hybridEvent.offlineTier,
      });
    });

    await test.step('Verify discounted card and ticket tier arithmetic', async () => {
      const { originalPrice, discountPercent, discountedPrice } = buyerEventsDetailData.discountedEvent;
      expect(originalPrice - (originalPrice * discountPercent) / 100).toBe(discountedPrice);

      await productPurchasePage.gotoSharePath(buyerEventsDetailData.discountedEvent.path);
      await productPurchasePage.expectEventDiscountedTier(buyerEventsDetailData.discountedEvent.tierPricePattern);
    });

    await test.step('Verify the owner sees Edit Product instead of purchase actions', async () => {
      await productPurchasePage.gotoSharePath(buyerEventsDetailData.ownerEvent.path);
      await productPurchasePage.expectOwnerEventView();
    });
  });

  test('Validate Event Ticket Selection, Buyer Form, and Add to Cart', {
    tag: ['@AUT-FV-320', '@cart', '@buyer', '@smoke'],
  }, async ({ productPurchasePage, cartPage }) => {
    test.setTimeout(180000);

    const { hybridEvent, checkout } = buyerEventsDetailData;

    await test.step('Open an event and verify ticket selection gates the sticky actions', async () => {
      await productPurchasePage.gotoSharePath(hybridEvent.path);
      await productPurchasePage.expectEventStickyBarBeforeSelection();
      await productPurchasePage.selectEventTicket(hybridEvent.onlineTier);
      await productPurchasePage.expectEventStickyBarEnabledAfterScroll();
    });

    await test.step('Complete the event buyer form with contact and attendee details', async () => {
      await productPurchasePage.openEventCheckout();
      await productPurchasePage.expectEventCheckoutForm({
        title: hybridEvent.title,
        tierName: hybridEvent.onlineTier,
        subtotal: checkout.subtotalAmount,
      });
      await productPurchasePage.expectEventPhoneValidation();
      await productPurchasePage.submitEventCheckout();
    });

    await test.step('Verify the Product Added confirmation', async () => {
      await productPurchasePage.expectEventProductAdded({
        title: hybridEvent.title,
        creator: hybridEvent.creator,
      });
    });

    await test.step('Open Cart and verify the selected event ticket details', async () => {
      await productPurchasePage.clickEventSeeCart();
      await cartPage.expectLoaded();
      await cartPage.expectEventTicketItem({
        title: hybridEvent.title,
        creator: hybridEvent.creator,
        badge: buyerEventsDetailData.eventBadge,
        schedule: hybridEvent.allDayText,
        venue: hybridEvent.venue,
        address: hybridEvent.address,
        platform: hybridEvent.platform,
        tierName: hybridEvent.onlineTier,
        tierPrice: 'IDR10.000',
        quantityLabel: 'Ticket 1',
        attendeeName: checkout.attendeeName,
        attendeeEmail: checkout.attendeeEmail,
        attendeePhone: checkout.cartAttendeePhone,
        totalAmount: checkout.cartTotal,
      });
    });
  });
});
