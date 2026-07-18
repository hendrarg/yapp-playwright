# AUT-FV-205 and AUT-FV-206 Automation Design

## Goal

Automate guest promotion redemption from the Buyer direct product-purchase flow. Both mappings stop on the pre-payment purchase detail page; they do not log in, use the cart, or submit payment.

## Fixture data

Use the current development fixtures:

- Eligible product: `Telebot` by `hendrarg`, option `plan b`.
- Product-ineligible target: `Test Discounted Product` by `geri`.
- Active promotion: `U6UY6Y130UE` (12% off products owned by `hendrarg`).
- Expired promotion: `NOB4GFYHHHX`.
- Maximum-usage promotion: `GWA0AG3G`.
- Product-ineligible promotion: `27NZ6DYXETP`, owned by `hendrarg` and applied to the `geri` product.
- Nonexistent promotion: a fixed automation-only code kept with the other promotion data.

The not-started promotion is outside the mapped source cases and is not tested. Keep all mutable fixture values in one Buyer promotion data file so an intentional development-data change requires one update.

## Direct purchase flow

Use one minimal Buyer product page object for this flow:

1. Open the configured product detail directly.
2. Select the configured product option when the product requires one.
3. Arrive at the purchase detail page shown before payment.
4. Read the order summary, apply a promotion, and assert the resulting success or error state.

Do not add the product to the cart, open `/cart`, or use `CartPage`. Do not select a payment method or create a transaction.

## Preconditions and Sheet alignment

The product detail and pre-payment purchase detail must be accessible without login. Replace the authenticated-Buyer precondition in both Automation Mapping rows and covered source cases with guest-accessible product and promotion fixtures. Because the flow is unauthenticated and stops before payment, it does not depend on or mutate a Buyer's purchase history.

Update the Sheet preconditions before marking either mapping Automated. Keep the source steps focused on opening the prepared purchase detail and applying the promotion; do not add login or cart steps.

## AUT-FV-205

Add one unauthenticated Buyer-surface test tagged:

```text
@AUT-FV-205 @promotions @buyer @smoke @regression
```

The test opens the eligible `Telebot` purchase flow, applies `U6UY6Y130UE`, and verifies that the promotion is accepted once. This covers `TC-PRM-B-001` and `TC-PRM-B-002` without extending into payment.

## AUT-FV-206

Add one unauthenticated Buyer-surface test tagged:

```text
@AUT-FV-206 @promotions @buyer @regression
```

The test uses descriptive steps to:

1. Open the eligible `Telebot` purchase flow and capture the original order summary.
2. Apply `U6UY6Y130UE` and verify a 12% discount appears, the displayed subtotal decreases by that discount, and the fee-adjusted total decreases.
3. Reopen a clean eligible purchase detail for each nonexistent, expired, and maximum-usage code; verify the promotion is not applied and the order summary is unchanged.
4. Open `Test Discounted Product`, apply `27NZ6DYXETP`, verify `Invalid promo code`, and verify the product subtotal is unchanged with no discount.

The invalid cases remain inside the single AUT-FV-206 test. Reopening the direct purchase flow isolates each assertion without depending on a remove-promotion action or state left by the preceding case.

## Components

- Add one focused Buyer product page object and register its fixture.
- Add one Buyer promotion data file for product paths, product option, codes, and expected active discount.
- Add one Buyer promotions spec containing exactly one test per Automation ID.
- Reuse the plain `test` fixture, existing safe Playwright utilities, and existing path aliases. Do not add authentication, API setup, payment mocks, or a helper abstraction used by only this spec.

## Failure behavior

Missing product fixtures, purchase controls, promo controls, or order-summary values fail with the affected product or promotion context. The eligible-product invalid cases fail if any summary value changes. The creator-ineligible case fails if its exact error is absent, the product subtotal changes, or a discount appears. No case is skipped or silently replaced with another product.

## Verification

```powershell
npm run automation:context -- AUT-FV-205
npm run automation:context -- AUT-FV-206
npx tsc --noEmit
npx playwright test tests/buyer/promotions.spec.ts --project=chromium --grep @AUT-FV-205
npx playwright test tests/buyer/promotions.spec.ts --project=chromium --grep @AUT-FV-206
```
