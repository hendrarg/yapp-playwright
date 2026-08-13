import type { GoogleGenAI } from "@google/genai";
import { AI_BUNDLE_PROMPT } from "./prompt";
import { parseAiBundle, type AiContentBundle, type ContentKind } from "./content-schema";
import { getRunSeed } from "./seed";

const GEMINI_TIMEOUT_MS = 30_000;

const KIND_TO_KEY: Record<ContentKind, keyof AiContentBundle> = {
  "product:name": "productNames",
  "product:description": "productDescriptions",
  "course:name": "courseNames",
  "course:description": "courseDescriptions",
  "chapter:title": "chapterTitles",
  "episode:title": "episodeTitles",
  "episode:content": "episodeContents",
  "post:content": "postContents",
  "campaign:name": "campaignNames",
  "campaign:description": "campaignDescriptions",
  "tier:name": "tierNames",
  "tier:description": "tierDescriptions",
  "tier:benefits": "tierBenefits",
  "consultation:title": "consultationTitles",
  "consultation:description": "consultationDescriptions",
};

/** Test seam — mirrors eDOT's monkeypatchable `_request_model_payload`. */
export type BundleRequester = (prompt: string, model: string) => Promise<unknown>;

let clientPromise: Promise<GoogleGenAI | null> | undefined;
let pools: Partial<Record<ContentKind, unknown[]>> = {};
const poolIdx: Record<string, number> = {};
let warmPromise: Promise<void> | undefined;
let bundleRequester: BundleRequester = requestBundleFromGemini;

const apiKey = (): string => process.env.GEMINI_API_KEY ?? "";
const modelName = (): string => process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

/** Lazily create the Gemini client; only called when a key is present. */
async function getClient(): Promise<GoogleGenAI | null> {
  if (!apiKey()) return null;
  if (!clientPromise) {
    clientPromise = import("@google/genai").then(
      ({ GoogleGenAI }) => new GoogleGenAI({ apiKey: apiKey() }),
    );
  }
  return clientPromise;
}

/** Defensive: Gemini sometimes wraps JSON output in ```json fences. */
function stripFences(text: string): string {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return m ? m[1].trim() : text.trim();
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini timeout after ${ms}ms`)), ms),
    ),
  ]);
}

/** eDOT-shaped JSON-mode call: `response.text` is the JSON payload. */
async function requestBundleFromGemini(prompt: string, model: string): Promise<unknown> {
  const client = await getClient();
  if (!client) throw new Error("GEMINI_API_KEY not set");
  const response = await withTimeout(
    client.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    }),
    GEMINI_TIMEOUT_MS,
  );
  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty response");
  return JSON.parse(stripFences(text));
}

/**
 * Warm the per-run AI content pool once per worker. Idempotent, never throws.
 * Without a key it short-circuits before the SDK is even imported.
 */
export async function warmAiCache(): Promise<void> {
  if (warmPromise) return warmPromise;
  if (!apiKey()) {
    warmPromise = Promise.resolve();
    return warmPromise;
  }
  warmPromise = (async () => {
    try {
      const injected = process.env.YAPP_TEST_AI_BUNDLE;
      const raw = injected ? JSON.parse(injected) : await bundleRequester(AI_BUNDLE_PROMPT, modelName());
      const parsed = parseAiBundle(raw);
      applyBundle(parsed);
      if (Object.keys(parsed).length > 0) {
        console.log(`[test-data:ai] AI content pool ready (run seed=${getRunSeed()})`);
      } else {
        console.warn(
          `[test-data:ai] AI content pool is empty; using deterministic Faker fallback (run seed=${getRunSeed()})`,
        );
      }
    } catch (err) {
      console.warn(
        `[test-data:ai] AI content unavailable; using deterministic Faker fallback (run seed=${getRunSeed()}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  })();
  return warmPromise;
}

/**
 * Sync read used by factories. Never throws: when the pool for `kind` is missing
 * or exhausted, the seeded-Faker `fallback` is returned. Pools are not
 * modulo-cycled, so within a run titles stay distinct.
 */
export function getAiText(kind: ContentKind, fallback: () => string): string {
  const pool = pools[kind] as string[] | undefined;
  if (pool && pool.length) {
    const idx = poolIdx[kind] ?? 0;
    if (idx < pool.length) {
      poolIdx[kind] = idx + 1;
      return pool[idx];
    }
  }
  return fallback();
}

/** List variant, e.g. membership `benefits`. */
export function getAiTextList(kind: ContentKind, fallback: () => string[]): string[] {
  const pool = pools[kind] as string[][] | undefined;
  if (pool && pool.length) {
    const idx = poolIdx[kind] ?? 0;
    if (idx < pool.length) {
      poolIdx[kind] = idx + 1;
      return pool[idx];
    }
  }
  return fallback();
}

function applyBundle(bundle: Partial<AiContentBundle>): void {
  for (const [kind, key] of Object.entries(KIND_TO_KEY) as [ContentKind, keyof AiContentBundle][]) {
    const arr = bundle[key];
    if (Array.isArray(arr) && arr.length) pools[kind] = arr;
  }
}

export function resetAiCacheForTests(): void {
  pools = {};
  warmPromise = undefined;
  clientPromise = undefined;
  for (const k of Object.keys(poolIdx)) delete poolIdx[k];
}

export function setBundleRequesterForTests(fn: BundleRequester): void {
  resetAiCacheForTests();
  bundleRequester = fn;
}
