import { test, expect } from '../../src/fixtures/api.fixtures';

test.describe('Creator API — profile', () => {
  test('GET profile returns user data',
    { tag: ['@api', '@creator', '@smoke', '@profile'] },
    async ({ creatorRequest }) => {
      const response = await creatorRequest.get('/api/profile');
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const body = await response.json();
      expect(body).toBeDefined();
    });
});
