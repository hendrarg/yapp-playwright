/**
 * Static prompt for the one-per-run Gemini bundle request.
 *
 * The output is DATA ONLY: it is echoed into forms and asserted against the same
 * variable in tests. It is never executed, never used as a locator, and never
 * influences test control flow. No credentials or environment values are
 * included in the prompt.
 *
 * Product context below mirrors the real Yapp creator offerings (see
 * `productsCreationData.productTypes`) so generated copy fits the product type
 * it is typed into, rather than reading as generic e-commerce filler.
 */
export const AI_BUNDLE_PROMPT = `You are generating realistic Indonesian test content for Yapp, a creator monetization platform where creators sell to their audience.

Product knowledge — creators on Yapp sell these five offering types:
1. Digital Product — downloadable files (e-books, templates, presets, design assets, notion setups).
2. Online Course — an interactive course delivered as chapters, each chapter holding episodes (lessons).
3. Consultation — paid 1-on-1 bookings/appointments (mentoring, review sessions, audits).
4. Discord/Telegram Membership — paid tiers granting access to a private community, sold as named tiers with benefit lists.
5. Events and Tickets — webinars and live sessions sold as tickets.
Creators also publish feed posts (short captions) and run marketing campaigns.

Pricing knowledge — a price of 0 means the offering is FREE, not unpriced or broken:
- Every product type starts free by default: the "Add Pricing" toggle is ON when adding a product, and the price value defaults to 0.
- Switching that toggle OFF also means free — both states (ON with 0, or OFF) produce a free offering.
- So a newly created offering of any type is free until the creator types an actual price.
- The buyer UI renders price 0 as a "Free" label (and a "FREE" checkout badge) instead of a currency amount.
- Free checkout skips payment entirely: the buyer sees a zero total and a "Get Product" call to action.
- The same copy you generate is reused for both free and paid offerings, so it must read correctly either way.

Return ONLY a valid JSON object — no markdown fences, no prose. Every value must be plain text:
- Titles: 3-120 characters, no line breaks, no control characters, no markup or selector characters (< > [ ] { } " \\). Use only letters, digits, spaces and basic punctuation (. , ' ! ? & ( ) / -).
- Descriptions/captions/contents: 20-2000 characters, plain prose, no control characters.
- Each array below must have exactly 16 entries.
- Content must be varied and natural-sounding in Indonesian (a mix of Indonesian and common English tech/product terms is fine).
- Match each key to its offering type: downloadable-file wording for products, learning-program wording for courses, session wording for consultations.
- Never state a price, currency amount, discount percentage, or payment claim (no "Rp199.000", "hanya 99rb", "diskon 50%", "worth every rupiah") — the offering may be free.
- Never use the bare word "Free", "FREE", or "Gratis" as an entire title: those are UI price labels and must not be confused with content.

Keys:
{
  "productNames": [16 Digital Product titles — downloadable e-books, templates, presets, asset packs],
  "productDescriptions": [16 Digital Product descriptions — what the buyer downloads and gains, 1-3 sentences each],
  "courseNames": [16 Online Course titles — structured multi-chapter learning programs],
  "courseDescriptions": [16 Online Course descriptions — what the student will master, 1-3 sentences each],
  "chapterTitles": [16 online-course chapter titles — a stage of the learning path],
  "episodeTitles": [16 online-course episode titles — one concrete lesson inside a chapter],
  "episodeContents": [16 short episode lesson texts — 1-3 sentences each],
  "postContents": [16 creator feed post captions — 1-2 sentences each],
  "campaignNames": [16 marketing campaign names — short, 3-8 words],
  "campaignDescriptions": [16 campaign descriptions — 1-2 sentences each],
  "tierNames": [16 community membership tier names — short, 1-3 words],
  "tierDescriptions": [16 membership tier descriptions — what the member gets, 1-2 sentences each],
  "tierBenefits": [16 tiers, each an array of 3-5 short benefit phrases],
  "consultationTitles": [16 consultation service titles — a bookable session, 1-3 words],
  "consultationDescriptions": [16 consultation service descriptions — who it is for and what the session covers, 1-2 sentences each]
}`;
