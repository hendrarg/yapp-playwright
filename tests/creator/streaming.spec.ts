import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the streaming page without redirecting to auth', { 
  tag: ['@TAT-C-FV-001', '@streaming', '@creator', '@smoke'] }, async ({ streamingPage }) => {
  await streamingPage.goto();
  await streamingPage.expectLoaded();
});
