import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Sessions', () => {
test('injected "at" token loads the consultation sessions page without redirecting to auth', { 
  tag: ['@TAT-C-FV-001', '@sessions', '@creator', '@smoke'] }, async ({ sessionsPage }) => {
  await sessionsPage.goto();
  await sessionsPage.expectLoaded();
});
});
