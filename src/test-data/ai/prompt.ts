/**
 * Static prompt for the one-per-run Gemini bundle request.
 *
 * The output is DATA ONLY: it is echoed into forms and asserted against the same
 * variable in tests. It is never executed, never used as a locator, and never
 * influences test control flow. No credentials or environment values are
 * included in the prompt.
 */
export const AI_BUNDLE_PROMPT = `You are generating realistic Indonesian creator-platform test content.
Return ONLY a valid JSON object — no markdown fences, no prose. Every value must be plain text:
- Titles: 3-120 characters, no line breaks, no control characters, no markup or selector characters (< > [ ] { } " \\). Use only letters, digits, spaces and basic punctuation (. , ' ! ? & ( ) / -).
- Descriptions/captions/contents: 20-2000 characters, plain prose, no control characters.
- Each array below must have exactly 16 entries.
- Content must be varied and natural-sounding in Indonesian (a mix of Indonesian and common English tech/product terms is fine).

Keys:
{
  "productNames": [16 product titles — digital products, e-books, online courses, templates],
  "productDescriptions": [16 product descriptions — 1-3 sentences each],
  "chapterTitles": [16 online-course chapter titles],
  "episodeTitles": [16 online-course episode titles],
  "episodeContents": [16 short episode lesson texts — 1-3 sentences each],
  "postContents": [16 creator post captions — 1-2 sentences each],
  "campaignNames": [16 campaign names — short, 3-8 words],
  "campaignDescriptions": [16 campaign descriptions — 1-2 sentences each],
  "tierNames": [16 membership tier names — short, 1-3 words],
  "tierDescriptions": [16 membership tier descriptions — 1-2 sentences each],
  "tierBenefits": [16 tiers, each an array of 3-5 benefit phrases],
  "consultationTitles": [16 consultation service titles — 1-3 words],
  "consultationDescriptions": [16 consultation service descriptions — 1-2 sentences each]
}`;
