// ── Payment mock responses ────────────────────────────────────────

export const paymentMock = {
  success: {
    status: 'succeeded',
    id: 'pay_mock_123',
    amount: 9900,
    currency: 'usd',
    receiptUrl: 'https://receipt.mock/123',
  },
  pending: {
    status: 'pending',
    id: 'pay_mock_456',
    amount: 9900,
    currency: 'usd',
  },
  failure: {
    status: 'failed',
    id: 'pay_mock_789',
    amount: 9900,
    currency: 'usd',
    error: { code: 'card_declined', message: 'Your card was declined.' },
  },
} as const;

export const paymentHeaders = {
  'content-type': 'application/json',
  'x-request-id': 'mock-req-123',
} as const;
