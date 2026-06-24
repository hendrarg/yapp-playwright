// ── Common mock error responses ────────────────────────────────────

export const errorMock = {
  serverError: {
    status: 500,
    body: { error: 'Internal Server Error' },
  },
  notFound: {
    status: 404,
    body: { error: 'Resource not found' },
  },
  forbidden: {
    status: 403,
    body: { error: 'Forbidden', message: 'Insufficient permissions' },
  },
  unauthorized: {
    status: 401,
    body: { error: 'Unauthorized' },
  },
  validationError: {
    status: 400,
    body: {
      error: 'Validation Error',
      details: [{ field: 'name', message: 'Name is required' }],
    },
  },
} as const;
