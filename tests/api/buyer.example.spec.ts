import { test, expect } from '../../src/fixtures/api.fixtures';

test.describe('Buyer API — profile', () => {
  test('GET profile returns user data',
    { tag: ['@api', '@buyer', '@smoke', '@profile'] },
    async ({ buyerRequest }) => {
      const response = await buyerRequest.get('/api/profile');
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const body = await response.json();
      expect(body).toBeDefined();
    });
});
