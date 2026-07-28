import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Sessions', () => {
test('injected "at" token loads the consultation sessions page without redirecting to auth', { 
  tag: ['@sessions', '@creator', '@smoke'] }, async ({ creatorNav }) => {
  await creatorNav.open('sessions');
});
});
