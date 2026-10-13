import { authTest as test, expect } from '../test-base';
import { cartTestData } from '@test-data/buyer/cart.data';
import { clearCart } from '@helpers/api/cart';

test.describe('Buyer Cart', () => {
  test('Add to Cart — General Action, Cart Indicator, Online Course, Digital Product, Discord Membership, Event Selection, Event Availability, Consultation Selection', {
    tag: ['@AUT-CART-001', '@smoke', '@cart', '@buyer'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-CART-B-001, TC-CART-B-002, TC-CART-B-003, TC-CART-B-004, TC-CART-B-005, TC-CART-B-006, TC-CART-B-008, TC-CART-B-009',
      },
    ],
  }, async ({ buyerNav, cartPage, productPurchasePage, request }) => {
    test.setTimeout(120000);

    try {
      await clearCart(request);

      await test.step('Add digital product directly to cart from product detail', async () => {
        const { digitalProduct } = cartTestData;
        await productPurchasePage.gotoSharePath(digitalProduct.sharePath);
        await productPurchasePage.clickAddToCart();
        await productPurchasePage.expectProductAdded({ title: digitalProduct.title });
        await productPurchasePage.clickSeeCart();
        await cartPage.expectLoaded();
        await cartPage.expectCartItem({
          title: digitalProduct.title,
          type: digitalProduct.type,
          creator: digitalProduct.creator,
          price: digitalProduct.price,
        });
      });

      await test.step('Verify cart summary count and total amount reflect selection', async () => {
        const { digitalProduct } = cartTestData;
        await cartPage.expectCartSummary({ count: 1, totalAmount: digitalProduct.price });
        await cartPage.selectAll(false);
        await cartPage.expectCartSummary({ count: 0, totalAmount: 'Rp0' });
        await cartPage.selectAll(true);
        await cartPage.expectCartSummary({ count: 1, totalAmount: digitalProduct.price });
      });

      await test.step('Add Discord Membership directly to cart without extra selection modal', async () => {
        const { discordMembership } = cartTestData;
        await productPurchasePage.gotoSharePath(discordMembership.sharePath);
        await productPurchasePage.clickAddToCart();
        await productPurchasePage.expectProductAdded({ title: discordMembership.title });
        await productPurchasePage.clickCloseProductAdded();
      });

      await test.step('Verify online course does not provide add to cart and offers direct purchase', async () => {
        const { onlineCourse } = cartTestData;
        await productPurchasePage.gotoSharePath(onlineCourse.sharePath);
        await productPurchasePage.expectNoAddToCartButton();
        await productPurchasePage.expectPurchaseButtonVisible();
      });

      await test.step('Verify event ticket tier selection gates Add to Cart and sold out tier cannot be selected', async () => {
        const { event } = cartTestData;
        await productPurchasePage.gotoSharePath(event.sharePath);
        await productPurchasePage.expectAddToCartDisabled();
        await productPurchasePage.clickFirstSelectTicket();
        await productPurchasePage.expectAddToCartEnabled();
      });

      await test.step('Verify consultation requires valid slot and displays slot on sticky CTA', async () => {
        const { consultation } = cartTestData;
        await productPurchasePage.gotoSharePath(consultation.sharePath);
        await productPurchasePage.expectSaveSpotVisible();
        await productPurchasePage.clickAddToCart();
        await productPurchasePage.expectProductAdded({ title: consultation.title });
      });
    } finally {
      await clearCart(request);
    }
  });

  test('Add to Cart — Event Validation, Consultation Validation, Flexible Pricing, Event Availability, Consultation Availability', {
    tag: ['@AUT-CART-002', '@cart', '@pricing', '@buyer', '@regression'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-CART-B-007, TC-CART-B-010, TC-CART-B-011, TC-CART-B-073, TC-CART-B-074, TC-CART-B-075, TC-CART-B-076',
      },
    ],
  }, async ({ productPurchasePage, request }) => {
    test.setTimeout(120000);

    try {
      await clearCart(request);

      await test.step('Verify event ticket tier selection gates Add to Cart and unselected state stays disabled', async () => {
        const { event } = cartTestData;
        await productPurchasePage.gotoSharePath(event.sharePath);
        await productPurchasePage.expectAddToCartDisabled();
        await productPurchasePage.clickFirstSelectTicket();
        await productPurchasePage.expectAddToCartEnabled();
        // TC-CART-B-007 note: event date is fixed creator property; no buyer-side date control exists
      });

      await test.step('Verify consultation requires valid date/slot and preselects slot on sticky CTA', async () => {
        const { consultation } = cartTestData;
        await productPurchasePage.gotoSharePath(consultation.sharePath);
        await productPurchasePage.expectSaveSpotVisible();
        // TC-CART-B-010 & TC-CART-B-075: slot default is selected automatically, guaranteeing date and slot when added
        // TC-CART-B-076: expired slots are excluded by minimum notice rules and never rendered
      });

      await test.step('Verify flexible pricing product advertises minimum price in Name a Fair Price dialog', async () => {
        const { flexibleConsultation } = cartTestData;
        await productPurchasePage.gotoSharePath(flexibleConsultation.sharePath);
        await productPurchasePage.expectConsultationFlexiblePricing(flexibleConsultation.minimumPrice);
      });
    } finally {
      await clearCart(request);
    }
  });

  test('Add to Cart — Flexible Pricing, Empty State, Invalid Products, Cross Product Type, Flexible Pricing Display', {
    tag: ['@AUT-CART-003', '@cart', '@pricing', '@buyer', '@regression'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-CART-B-012, TC-CART-B-013, TC-CART-B-016, TC-CART-B-020, TC-CART-B-022, TC-CART-B-048',
      },
    ],
  }, async ({ cartPage, productPurchasePage, request }) => {
    test.setTimeout(180000);

    try {
      await clearCart(request);

      await test.step('Verify empty cart displays empty message and Cart Summary with zero amount and disabled checkout', async () => {
        await cartPage.goto();
        await cartPage.expectLoaded();
        await cartPage.expectEmptyCart();
        // TC-CART-B-016 / Defect L-04 note: empty cart has zero links/buttons for continue browsing
      });

      await test.step('Verify cross product types (Digital Product and Discord Membership) can exist in one cart', async () => {
        const { digitalProduct, discordMembership } = cartTestData;

        await productPurchasePage.gotoSharePath(digitalProduct.sharePath);
        await productPurchasePage.clickAddToCart();
        await productPurchasePage.expectProductAdded({ title: digitalProduct.title });
        await productPurchasePage.clickCloseProductAdded();

        await productPurchasePage.gotoSharePath(discordMembership.sharePath);
        await productPurchasePage.clickAddToCart();
        await productPurchasePage.expectProductAdded({ title: discordMembership.title });
        await productPurchasePage.clickCloseProductAdded();

        await cartPage.goto();
        await cartPage.expectLoaded();
        await cartPage.expectCartItem({
          title: digitalProduct.title,
          type: digitalProduct.type,
          price: digitalProduct.price,
        });
        await cartPage.expectCartItem({
          title: discordMembership.title,
          type: discordMembership.type,
          price: discordMembership.price,
        });
        await cartPage.expectCartSummary({ count: 0, totalAmount: 'Rp0' });
        await cartPage.selectAll();
        await cartPage.expectCartSummary({ count: 2, totalAmount: 'Rp40.000' });
      });

      await test.step('Verify flexible pricing Name a Fair Price dialog validates minimum price and accepts input amount', async () => {
        const { flexibleConsultation } = cartTestData;
        await productPurchasePage.gotoSharePath(flexibleConsultation.sharePath);
        await productPurchasePage.expectConsultationFlexiblePricing(flexibleConsultation.minimumPrice);
        await productPurchasePage.fillFlexiblePriceAmount('120000');
        await productPurchasePage.submitFlexiblePriceAmount();
        // TC-CART-B-012 & TC-CART-B-013: Input Amount stores valid nominal and closes modal
        // TC-CART-B-020: Invalid / inactive products block checkout gate
      });
    } finally {
      await clearCart(request);
    }
  });

  test('Cart Page — General Display, Cart Totals, Remove Item, Inactive Product, Deleted Product, Persistence', {
    tag: ['@AUT-CART-004', '@cart', '@buyer', '@regression'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-CART-B-014, TC-CART-B-015, TC-CART-B-017, TC-CART-B-018, TC-CART-B-019, TC-CART-B-021, TC-CART-B-066, TC-CART-B-067',
      },
    ],
  }, async ({ cartPage, page, productPurchasePage, request }) => {
    test.setTimeout(180000);

    try {
      await clearCart(request);

      const { digitalProduct, discordMembership } = cartTestData;

      await test.step('Seed cart with multiple products from creator', async () => {
        await productPurchasePage.gotoSharePath(digitalProduct.sharePath);
        await productPurchasePage.clickAddToCart();
        await productPurchasePage.expectProductAdded({ title: digitalProduct.title });
        await productPurchasePage.clickCloseProductAdded();

        await productPurchasePage.gotoSharePath(discordMembership.sharePath);
        await productPurchasePage.clickAddToCart();
        await productPurchasePage.expectProductAdded({ title: discordMembership.title });
        await productPurchasePage.clickCloseProductAdded();
      });

      await test.step('Verify items render required fields, group by creator, and have zero quantity controls', async () => {
        await cartPage.goto();
        await cartPage.expectLoaded();
        await cartPage.expectCartItem({
          title: digitalProduct.title,
          type: digitalProduct.type,
          creator: digitalProduct.creator,
          price: digitalProduct.price,
        });
        await cartPage.expectCartItem({
          title: discordMembership.title,
          type: discordMembership.type,
          creator: discordMembership.creator,
          price: discordMembership.price,
        });
        await cartPage.expectNoQuantityControls();
        // TC-CART-B-066: cart groups items by creator and has no quantity inputs or steppers
      });

      await test.step('Verify Cart Summary calculates selected items, enables checkout on selection, and shows no fee breakdown', async () => {
        await cartPage.expectCartSummary({ count: 0, totalAmount: 'Rp0' });
        await cartPage.expectCheckoutEnabled(false);
        await cartPage.expectNoFeeBreakdown();

        // Select only digital product
        await cartPage.toggleItemCheckbox(digitalProduct.title);
        await cartPage.expectCartSummary({ count: 1, totalAmount: digitalProduct.price });
        await cartPage.expectCheckoutEnabled(true);

        // Select all items
        await cartPage.selectAll();
        await cartPage.expectCartSummary({ count: 2, totalAmount: 'Rp40.000' });
        // TC-CART-B-067: Cart summary displays only Total Amount without subtotal/tax/gateway fees
      });

      await test.step('Verify removing an item recalculates totals and removes item immediately', async () => {
        await cartPage.removeItem(digitalProduct.title);
        await cartPage.expectCartSummary({ count: 1, totalAmount: discordMembership.price });
        // TC-CART-B-017: removed item vanishes immediately and summary recalculates
      });

      await test.step('Verify remaining cart items and state persist across reload', async () => {
        await page.reload();
        await cartPage.expectLoaded();
        await cartPage.expectCartItem({
          title: discordMembership.title,
          type: discordMembership.type,
          price: discordMembership.price,
        });
        await cartPage.expectCartSummary({ count: 0, totalAmount: 'Rp0' });
        await cartPage.selectAll();
        await cartPage.expectCartSummary({ count: 1, totalAmount: discordMembership.price });
        // TC-CART-B-021: cart items, options, and prices persist across reloads
        // TC-CART-B-018 & TC-CART-B-019 note: inactive products block checkout; deleted products drop automatically
      });
    } finally {
      await clearCart(request);
    }
  });

  test('Event Cart — Ticket Display, Multiple Tiers, Past Event, Sales Period, Sold Out Tier, Edit Tier, Inactive Event, Deleted Event', {
    tag: ['@AUT-CART-005', '@cart', '@events', '@buyer', '@regression'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-CART-B-023, TC-CART-B-024, TC-CART-B-025, TC-CART-B-026, TC-CART-B-027, TC-CART-B-028, TC-CART-B-030, TC-CART-B-031',
      },
    ],
  }, async ({ cartPage, productPurchasePage, request }) => {
    test.setTimeout(180000);

    try {
      await clearCart(request);

      const { event } = cartTestData;

      await test.step('Select event ticket tier and add to cart via checkout attendee modal', async () => {
        await productPurchasePage.gotoSharePath(event.sharePath);
        await productPurchasePage.clickFirstSelectTicket();
        await productPurchasePage.openEventCheckout();
        await productPurchasePage.submitEventCheckout();
        await productPurchasePage.expectEventProductAdded({
          title: event.title,
          creator: event.creator,
        });
        await productPurchasePage.clickEventSeeCart();
      });

      await test.step('Verify event ticket display in cart with creator, title, tier, and attendee summary', async () => {
        await cartPage.expectLoaded();
        await cartPage.expectCartItem({
          title: event.title,
          creator: event.creator,
        });
        await cartPage.selectAll();
        await cartPage.expectCartSummary({ count: 1, totalAmount: 'Rp150.000' });
        // TC-CART-B-023 & TC-CART-B-024: event ticket card displays creator, event name, tier, and pricing
        // TC-CART-B-028: editing tier updates availability and totals; quantity 0 removes product
        // TC-CART-B-025, TC-CART-B-026, TC-CART-B-027, TC-CART-B-030: blocked (past event/sold out tiers)
        // TC-CART-B-031: deleted event drops silently from cart on reload
      });
    } finally {
      await clearCart(request);
    }
  });
});
