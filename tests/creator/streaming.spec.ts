import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Streaming', () => {
test('injected "at" token loads the streaming page without redirecting to auth', {tag: ['@streaming', '@creator', '@smoke'] }, async ({ creatorNav }) => {
  await creatorNav.open('streaming');
});
});
