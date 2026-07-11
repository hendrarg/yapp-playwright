import { test, expect } from '../../src/fixtures/api.fixtures';
import { createPost } from '@helpers/api/post';
import { generatePostData, testImages } from '@test-data/creator/post.data';

function requireCreatorPostToken(): string {
  const token = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
  if (!token) {
    test.skip(true, 'YAPP_TEST_ACCESS_TOKEN_2 must be set to run creator post API tests');
    throw new Error('YAPP_TEST_ACCESS_TOKEN_2 is required');
  }
  return token;
}

test.describe.configure({ mode: 'serial' });

test.describe('Post API — create post with upload (sequential)', () => {
  test('Full upload flow: create → sign → PUT S3 → complete → posts',
    { tag: ['@api', '@regression', '@post'] },
    async ({ buyerRequest }) => {
      const token2 = requireCreatorPostToken();
      const { postId, uploadId } = await createPost(buyerRequest, {
        ...generatePostData({ visibility: 'pay_per_view', price: 22000 }),
        imagePath: testImages.claude,
      }, token2);

      expect(postId).toBeDefined();
      expect(uploadId).toBeDefined();
    });

  test('Text-only post (single API call)',
    { tag: ['@api', '@regression', '@post'] },
    async ({ buyerRequest }) => {
      const token2 = requireCreatorPostToken();
      const { postId } = await createPost(buyerRequest, generatePostData({ visibility: 'public' }), token2);
      expect(postId).toBeDefined();
    });
});
