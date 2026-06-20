import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the consultation sessions page without redirecting to auth', { 
  tag: ['@sessions', '@creator', '@smoke'] }, async ({ sessionsPage }) => {
  await sessionsPage.goto();
  await sessionsPage.expectLoaded();
});
