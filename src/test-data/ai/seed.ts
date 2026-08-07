import { faker } from "@faker-js/faker";

let cachedRunSeed: number | undefined;

/**
 * Resolve the run seed: an optional fixed `YAPP_TEST_SEED` override wins,
 * otherwise a per-run value derived from the clock + pid — unique across runs,
 * stable within the process (reproducible when re-running the same seed).
 */
function resolveSeed(): number {
  const env = process.env.YAPP_TEST_SEED;
  if (env !== undefined && env.trim() !== "") {
    const n = Number(env);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return (Date.now() ^ (process.pid & 0xffff)) >>> 0;
}

/**
 * Derive the run seed once per worker and seed the global faker singleton.
 * Must be called before any factory runs (done at module scope in test-base).
 */
export function getRunSeed(): number {
  if (cachedRunSeed === undefined) {
    cachedRunSeed = resolveSeed();
    faker.seed(cachedRunSeed);
  }
  return cachedRunSeed;
}

/** Test seam: re-derive the seed from the current env (also re-seeds faker). */
export function resetRunSeedForTests(): void {
  cachedRunSeed = undefined;
  getRunSeed();
}
