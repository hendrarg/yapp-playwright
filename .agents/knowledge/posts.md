> [[projects/yapp/knowledge/index|Domain knowledge index]]

# Posts and feeds

Creator post composition, visibility tiers, and pay-per-view pricing.

## Visibility tiers

`Create Post` carries a visibility pill with three values — **Public**, **Pay per
view**, **Member only** — mapping to the API's
`public | pay_per_view | membership_only`.

Post payload shape:

```json
{"content": "", "status": "active", "visibility": "public",
 "assets": [], "productUuids": [], "price": 0, "isFlexiblePrice": false}
```

`POST /api/v1/posts` creates, `PUT /api/v1/posts/{uuid}` edits, and
`DELETE /api/v1/posts/{uuid}` cleans up (a later GET returns 404).

## Pay-per-view pricing

Established 2026-08-19 while re-checking a defect claiming Rp0 PPV posts could be
published.

**The price control is one level down, not a field in the composer.** Picking
`Pay per view` flips the pill to read `Exclusive Rp0,00`. The price is set through an
**`Edit Price` menu item inside that same visibility dropdown**, which opens a second
modal.

**The client enforces the Rp20.000 minimum precisely.** The price modal shows
`Min. price: Rp20.000` and its `Confirm` button is disabled for empty / 0 / 1 / 5.000
/ 19.999 and enabled at 20.000 / 25.000 — identical on create and edit, so there is
no UI bypass.

**The server enforces nothing.** `POST /api/v1/posts` with
`{visibility:"pay_per_view", price:0}` or `price:5000` returns `200 Post created`,
and `PUT` happily lowers an existing PPV post to `price: 0`. That is where Rp0 PPV
fixtures come from — and why the rule cannot be called server-side.

**With price still Rp0 the `Post` button is enabled but inert:** zero requests, no
toast, no inline error, no `aria-invalid`, and the dialog stays open. Publishing
really is blocked; the creator simply is not told why. Do not read "button enabled"
as "action succeeded" — press it and read the resulting request.

## The feed composer is looser than the product forms

Verified 2026-08-31. Open it from the `Post something here...` area on `/feeds`; the
`Post` button in the header does not open it.

**Media accept is wider than anywhere else in the product**:
`image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,video/*`, multiple
allowed. Product thumbnails accept only jpeg/png/gif/webp, so **BMP and SVG are
composer-only** — worth flagging separately, since SVG can carry script.

**The post body has no `maxlength` and no counter**, and there is no separate title
field. The composer shows no copy about file size, media count, or video duration.
`Post` stays disabled until there is content.

## Lifetime unlock has its own price floor

`Configure Lifetime` on `/feeds` states `Min. price: Rp20.000,00` — **double** the
Rp10.000 floor that applies to ordinary products. Do not reuse the product floor here.

## Exclusive is a filter, not a profile tab

On a creator's public profile a buyer sees `Shops`, `Links`, `Feeds`, `Support`,
`Membership`. There is no top-level Exclusive tab: exclusive posts are reached through
the `All Feeds` / `Exclusive Only` filter **inside** the Feeds tab. The creator-side
tab configuration and where exclusive content actually lives are two different things.
