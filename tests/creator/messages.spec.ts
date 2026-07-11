import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the messages page without redirecting to auth', { 
  tag: ['@TAT-C-FV-001', '@messages', '@creator', '@smoke'] }, async ({ messagesPage }) => {
  await messagesPage.goto();
  await messagesPage.expectLoaded();
});
