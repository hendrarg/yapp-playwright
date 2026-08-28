# Products

How product creation, pricing, media, and status behave across all six Yapp product
types — Event & Tickets, Consultation, Discord Membership, Telegram Membership,
Digital Download, Online Course.

## Pricing: every product starts free

On Add Product for **any** product type the `Add Pricing` toggle defaults to **ON**
with the price value at **0**. Switching the toggle **OFF** also yields a free
product — both states mean free. A new offering is free until the creator types a
real price. Confirmed by the product owner 2026-08-08.

The buyer side renders price 0 as `Free`: a `FREE` checkout badge, zero total, and a
`Get Product` CTA instead of payment.

**The amount rule is "either 0 or at least Rp10.000", on every product type.**
Zero is legitimate and means Free; the rejected range is **1 to 9,999**, with the
message `Price must be either 0 or at least Rp10.000`. Confirmed 2026-08-13 and
verified on Digital Download and Online Course.

On some forms that message only surfaces after the next-step button is pressed — do
not conclude there is no validation because typing and blurring produced nothing. A
A test case expecting "zero price is rejected" is asserting the wrong rule.

## Thumbnails

Confirmed 2026-08-13 as applying to **every** product type.

**Capacity is 11 images: 1 hero slot plus a 10-slot gallery.** In the DOM the
gallery reads as 1 chooser tile plus 9 `No Image` placeholders, which is where
miscounts come from — the hero is a separate control and is easy to omit from the
total. Several sheets carried wrong figures (Digital Download said max 8, Event &
Tickets said 9 additional / 10 total); both were corrected to 11.

**The gallery accepts multiple files on all six product types**, every one carrying
the identical accept list
`image/jpeg,.jpeg,.jpg,image/png,.png,image/gif,.gif,image/webp,.webp` — the same
list the hero uses. The hero is single-file, which is correct for one primary image.
**There is no deviation between product types.** Two "deviation" findings reached the
sheets and had to be retracted; both came from probing a third, unrelated image input
on the page (see the locator trap in `.agents/rules/mcp-playwright.md`).

**Hero constraints:** minimum **500 × 500 px**, smaller than **500 MB**, and
required — publishing is blocked with `Thumbnail is required` / `Hero image is
required` until it is set.

**An undersized image is always rejected with a toast naming the file**, in this
exact shape, on every product type:

```text
Screenshot 2026-06-14 163733.png is too small. Image must be at least 500 x 500 pixels.
```

The file does not enter the slot. Rejection is never silent — two "silent rejection"
reports for Consultation, Digital Download, and Online Course were wrong and have
been corrected in the sheets.

## Status lifecycle

Established by live testing 2026-08-13 (Products sheet).

**Status changes commit immediately, with no Save.** The `Set Inactive` switch at the
top of the product edit page (`/products/update/{type}/{uuid}`, on both step 1 and
step 2) fires `PUT /api/v1/shop/products/{uuid}/status` with
`{"status":"inactive"|"active"}` → 200 `Update Product Successfully`. The switch
prefills from the stored status, so `aria-checked="true"` means the product is
currently Inactive.

The same control exists in the Products-list actions menu and works identically:
toast `Product set to inactive` / `Product set to active` after ~0.5–0.75 s, the row
changes tab, and tab counts update live. **Promotion uses the same component**:
`PATCH /promos/{uuid}/status` with `{"isActive":false|true}` → 200.

The menu label always reads `Set Inactive` for Active, Inactive, and Draft alike —
the state lives in the switch, not the label, so reactivation is available from the
list too.

**`Save and Publish` re-activates the product, and that is intended.** Publishing
means putting it on sale. Confirmed by the product owner 2026-08-19. Practical
consequence: change status with the switch and navigate away — do not save
afterwards.

**`Hide from Profile` has an unwired UI, which is expected.** The menu item sends
nothing, and the product owner classified that as expected on 2026-08-19 — it is not
a defect. The feature itself works via
`PUT /api/v1/shop/products/{uuid}/hide-from-profile` with `{"isHideFromProfile":true}`
(body required; empty body gives 400 `IsHideFromProfile is required`). It removes the
product from `yapp-dev.yapp.ink/{username}` for anonymous visitors while the direct
URL stays 200 with purchase CTAs live. No other UI control sets the flag — the My
Page card menu is only Edit / Set as Featured / Share / Delete. Toggling it also
**resets the product to the front of the My Page arrangement**; restore position by
dragging the card grip (`PATCH /shop/products/reorder`).

**Status only binds profile visibility.** Inactive products disappear from the
creator profile but their direct product URL stays 200 with purchase CTAs enabled;
Draft products are likewise fully purchasable via direct URL. Deletion is real —
`DELETE /shop/products/{uuid}` and the URL becomes 404.

## Online Course: After Sales default

The After Sales "Customize Message" switch has two different defaults, because
`aria-checked` derives from the product's saved config rather than a static default:

- **Create form** — the switch starts ON.
- **Edit mode of a product with no saved config** (`thankYouNote=""`,
  `salesLinks=[]`) — the switch reads OFF. The create-form ON state is not persisted
  until a message is actually saved.

For an API-seeded course expect OFF unless the seed includes `thankYouNote` and/or
`salesLinks`. Use the `{ title, url }` shape for `salesLinks` — a plain `label`
causes a 500 `sales link title is required`.

## Route and label asymmetries

The create and edit routes do not use the same product-type slug:

- Consultation is created at `/products/create/consultation` but edited at
  `/products/update/**appointment**/{uuid}` — using `consultation` on the edit route
  returns 404.
- Online Course uses the CTA `Next: Edit Details`, where every other product type uses
  `Next: Set Details`.

## The description counter counts words, not characters

Open defect M-07, confirmed on **all six product types** in Aug 2026: the
`n / 500` counter under a product description increments per **word** while the
displayed unit implies characters, so the limit a creator actually hits is
unpredictable. Measured: 31 characters / 5 words renders `5 / 500`; 150 characters /
30 words renders `30 / 500`.

It is a unit bug rather than a design decision — on the same product the after-sales
counter counts characters correctly (`31/1000 characters`) and the Online Course body
editor labels its unit honestly (`11 words`). Three counter components exist and only
the description one misleads.

Do not write a test case that treats `n / 500` as a character limit until this is
fixed.
