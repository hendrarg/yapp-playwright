/**
 * Content kinds the AI bundle can provide, and the shape of the Gemini payload.
 *
 * Validation is hand-rolled (no schema lib): the value we need is "does this
 * payload fit a shape we can safely echo into forms" — not rich error messages,
 * so graceful per-key degradation (invalid key dropped -> Faker fallback) is all
 * we require.
 */

export type ContentKind =
  | "product:name"
  | "product:description"
  | "chapter:title"
  | "episode:title"
  | "episode:content"
  | "post:content"
  | "campaign:name"
  | "campaign:description"
  | "tier:name"
  | "tier:description"
  | "tier:benefits"
  | "consultation:title"
  | "consultation:description";

export interface AiContentBundle {
  productNames: string[];
  productDescriptions: string[];
  chapterTitles: string[];
  episodeTitles: string[];
  episodeContents: string[];
  postContents: string[];
  campaignNames: string[];
  campaignDescriptions: string[];
  tierNames: string[];
  tierDescriptions: string[];
  tierBenefits: string[][];
  consultationTitles: string[];
  consultationDescriptions: string[];
}

const TITLE_MAX = 120; // generous but echo-safe upper bound for titles
const PARAGRAPH_MAX = 2000; // product descriptions, post captions, episode content

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Titles must survive Playwright `text=` matching: no control chars, no
 * markup/selector-hostile characters, no surrounding whitespace.
 */
export const isSafeTitle = (s: string): boolean =>
  s.length <= TITLE_MAX &&
  s === s.trim() &&
  /^[A-Za-z0-9 .,'!?&()/-]+$/.test(s);

/** Paragraphs reject only control chars; length-bounded to keep payloads sane. */
export const isSafeParagraph = (s: string): boolean =>
  s.length > 0 && s.length <= PARAGRAPH_MAX && !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(s);

function normalizeStrings(
  value: unknown,
  opts: { max: number; safe: (s: string) => boolean },
): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const s = item.trim();
    if (!s) continue;
    if (s.length > opts.max || !opts.safe(s)) return null;
    out.push(s);
  }
  return out.length >= 1 ? out : null;
}

function normalizeBenefitSets(value: unknown): string[][] | null {
  if (!Array.isArray(value)) return null;
  const out: string[][] = [];
  for (const set of value) {
    if (!Array.isArray(set)) return null;
    const phrases = set
      .filter((p): p is string => typeof p === "string")
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && p.length <= 100);
    if (phrases.length < 1 || phrases.length > 5) return null;
    out.push(phrases);
  }
  return out.length >= 1 ? out : null;
}

/**
 * Validate a parsed Gemini bundle. Graceful per-key degradation: invalid or
 * missing keys are dropped, and those content kinds fall back to Faker.
 */
export function parseAiBundle(raw: unknown): Partial<AiContentBundle> {
  if (!isPlainObject(raw)) return {};
  const bundle: Partial<AiContentBundle> = {};
  const titleKeys: Array<[keyof AiContentBundle, unknown]> = [
    ["productNames", raw.productNames],
    ["chapterTitles", raw.chapterTitles],
    ["episodeTitles", raw.episodeTitles],
    ["campaignNames", raw.campaignNames],
    ["tierNames", raw.tierNames],
    ["consultationTitles", raw.consultationTitles],
  ];
  const paragraphKeys: Array<[keyof AiContentBundle, unknown]> = [
    ["productDescriptions", raw.productDescriptions],
    ["episodeContents", raw.episodeContents],
    ["postContents", raw.postContents],
    ["campaignDescriptions", raw.campaignDescriptions],
    ["tierDescriptions", raw.tierDescriptions],
    ["consultationDescriptions", raw.consultationDescriptions],
  ];
  for (const [key, value] of titleKeys) {
    const n = normalizeStrings(value, { max: TITLE_MAX, safe: isSafeTitle });
    if (n) (bundle as Record<string, unknown>)[key] = n;
  }
  for (const [key, value] of paragraphKeys) {
    const n = normalizeStrings(value, { max: PARAGRAPH_MAX, safe: isSafeParagraph });
    if (n) (bundle as Record<string, unknown>)[key] = n;
  }
  const benefits = normalizeBenefitSets(raw.tierBenefits);
  if (benefits) bundle.tierBenefits = benefits;
  return bundle;
}
