# Add Nav Route

Register a new buyer or creator route in the domain nav helper after scaffolding a page object.

## Buyer

Files (in order):

1. `src/pages/buyer/{Page}.ts`
2. `src/fixtures/page.fixtures.ts`
3. `src/helpers/buyer/nav.ts` — `BuyerRoute`, `BuyerNavParams`, `goto`, `expectLoaded`
4. `src/fixtures/buyer-nav.fixture.ts` — `BuyerNavDeps` + destructure
5. `.agents/rules/testing.md` — buyer **Routes** list

Verify: `npx tsc --noEmit` && `npx playwright test --list`

Param routes today: `profile` (`handle?`), `tip`/`sendTip` (`handle`, `amount?`), `membership` (`handle`), `tierDetail` (`handle`, `tierId`), `transaction` (`orderId`), `productPurchase` (`product`).

## Creator

Files (in order):

1. `src/pages/creator/{Page}.ts`
2. `src/fixtures/page.fixtures.ts`
3. `src/helpers/creator/nav.ts` — `CreatorRoute`, `goto`, `expectLoaded`
4. `src/fixtures/creator-nav.fixture.ts` — `CreatorNavDeps` + destructure
5. `.agents/rules/testing.md` — creator **Routes** list

Verify: `npx tsc --noEmit` && `npx playwright test --list`

## Aliases

Add via `normalizeRoute()` in the domain `nav.ts` file (e.g. `direct` → `messages`).

Full detail: `.agents/rules/testing.md` and `.agents/skills/add-page-object/SKILL.md` step 6.
