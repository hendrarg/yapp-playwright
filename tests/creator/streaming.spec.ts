import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Streaming', () => {
test('injected "at" token loads the streaming page without redirecting to auth', { 
  tag: ['@AUT-FV-314', '@streaming', '@creator', '@smoke'] }, async ({ streamingPage }) => {
  await streamingPage.goto();
  await streamingPage.expectLoaded();
});
});
