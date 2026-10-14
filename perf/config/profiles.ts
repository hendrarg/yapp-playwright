import type { Scenario } from 'k6/options';

/**
 * Load shapes, selected with `PROFILE=<name>`. Only `smoke` is safe to run at any
 * time: the API under test (`staging.yapp.ink`) is shared with E2E and manual QA and
 * sits behind a WAF, so anything heavier needs a slot agreed with BE/DevOps first.
 * `load` VU counts are placeholders until the baseline run (phase 2) sets them.
 */
const profiles: Record<string, Scenario> = {
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '1m',
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 10 },
      { duration: '10m', target: 10 },
      { duration: '1m', target: 0 },
    ],
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 10 },
      { duration: '3m', target: 25 },
      { duration: '3m', target: 50 },
      { duration: '3m', target: 100 },
      { duration: '2m', target: 0 },
    ],
  },
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 5 },
      { duration: '10s', target: 100 },
      { duration: '2m', target: 100 },
      { duration: '10s', target: 5 },
      { duration: '1m', target: 0 },
    ],
  },
  soak: {
    executor: 'constant-vus',
    vus: 10,
    duration: '1h',
  },
};

export function scenarioFor(profile: string): Scenario {
  const scenario = profiles[profile];
  if (!scenario) throw new Error(`Unknown PROFILE "${profile}" — use one of: ${Object.keys(profiles).join(', ')}`);
  return scenario;
}
