import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Campaigns', () => {
test('injected "at" token loads the campaigns page without redirecting to auth', {tag: ['@campaigns', '@creator', '@smoke'] }, async ({ creatorNav }) => {
  await creatorNav.open('campaigns');
});
});
