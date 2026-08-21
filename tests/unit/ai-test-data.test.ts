import { test, expect } from '../test-base';
import { warmAiCache, resetAiCacheForTests, resetRunSeedForTests } from '@test-data/ai';
import * as aiGemini from '@test-data/ai/gemini';
import { generateProduct } from '@test-data/creator/product.data';
import { generateOnlineCourseChapterTitle } from '@test-data/creator/products.creation.data';

// Capture the true original env BEFORE forcing offline mode below, so afterEach
// can restore it for subsequent spec files sharing this worker.
const ORIG_ENV = {
  key: process.env.GEMINI_API_KEY,
  seed: process.env.YAPP_TEST_SEED,
};

// Force offline so the shared `test.beforeAll(() => warmAiCache())` in test-base
// is a no-op (no SDK import, no network).
process.env.GEMINI_API_KEY = '';
process.env.YAPP_TEST_SEED = '17';

test.beforeEach(() => {
  process.env.GEMINI_API_KEY = '';
  process.env.YAPP_TEST_SEED = '17';
  resetRunSeedForTests();
  resetAiCacheForTests();
});

test.afterEach(() => {
  if (ORIG_ENV.key === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = ORIG_ENV.key;
  if (ORIG_ENV.seed === undefined) delete process.env.YAPP_TEST_SEED;
  else process.env.YAPP_TEST_SEED = ORIG_ENV.seed;
  resetRunSeedForTests();
  resetAiCacheForTests();
});

test(
  'Faker fallback is deterministic per seed + call position (no key)',
  { tag: ['@test-data', '@smoke'] },
  () => {
    const a = generateProduct();
    expect(a.name.length).toBeGreaterThan(0);
    resetRunSeedForTests(); // same seed, same call position -> identical output
    const a2 = generateProduct();
    expect(a2.name).toBe(a.name);
    expect(a2.description).toBe(a.description);
  },
);

test(
  'invalid AI output (not JSON) falls back to Faker',
  { tag: ['@test-data', '@smoke'] },
  async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    aiGemini.setBundleRequesterForTests(async () => 'not json at all');
    await warmAiCache();
    const p = generateProduct();
    expect(p.name.length).toBeGreaterThan(0);
    expect(p.description.length).toBeGreaterThan(0);
  },
);

test(
  'AI payload with wrong shape still falls back per kind',
  { tag: ['@test-data', '@smoke'] },
  async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    aiGemini.setBundleRequesterForTests(async () => ({
      productNames: 'oops',
      chapterTitles: [123],
    }));
    await warmAiCache();
    expect(generateProduct().name.length).toBeGreaterThan(0);
    expect(generateOnlineCourseChapterTitle().length).toBeGreaterThan(0);
  },
);

test(
  'valid AI bundle is used when the client returns a compliant payload',
  { tag: ['@test-data', '@smoke'] },
  async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const bundle = {
      productNames: ['Produk Kreatif AI'],
      productDescriptions: ['Deskripsi produk dari AI.'],
      chapterTitles: ['Bab Satu'],
      episodeTitles: ['Eps Satu'],
      episodeContents: ['Konten dari AI.'],
      postContents: ['Caption dari AI.'],
      campaignNames: ['Promo AI'],
      campaignDescriptions: ['Deskripsi promo.'],
      tierNames: ['Tier AI'],
      tierDescriptions: ['Deskripsi tier.'],
      tierBenefits: [['Benefit A', 'Benefit B']],
      consultationTitles: ['Konsultasi AI'],
      consultationDescriptions: ['Deskripsi konsultasi.'],
    };
    aiGemini.setBundleRequesterForTests(async () => bundle);
    await warmAiCache();
    expect(generateProduct().name).toBe('Produk Kreatif AI');
    expect(generateOnlineCourseChapterTitle()).toBe('Bab Satu');
  },
);
