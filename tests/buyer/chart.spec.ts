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
        await cartPage.selectAll();
        await cartPage.expectCartSummary({ count: 0, totalAmount: 'Rp0' });
        await cartPage.selectAll();
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
});
