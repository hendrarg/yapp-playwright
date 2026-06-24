// ── Email / notification mock responses ───────────────────────────

export const emailMock = {
  sent: {
    messageId: 'msg_mock_001',
    status: 'sent',
    to: 'user@example.com',
  },
  bounced: {
    messageId: 'msg_mock_002',
    status: 'bounced',
    reason: 'hard_bounce',
    to: 'invalid@example.com',
  },
  throttled: {
    messageId: 'msg_mock_003',
    status: 'throttled',
    retryAfter: 60,
    to: 'user@example.com',
  },
} as const;
