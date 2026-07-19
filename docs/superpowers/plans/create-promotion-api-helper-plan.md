# Create and Delete Promotion API Helper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Menambahkan helper typed untuk membuat dan menghapus promo melalui API Yapp.

**Architecture:** Helper berada di `src/helpers/api/promotion.ts` dan
menggunakan `apiUrl()` serta header helpers yang sudah ada, dengan origin
creator untuk melewati WAF seperti request browser. Kedua operasi memakai
header builder yang sama. Payload dinamis berada di
`src/test-data/creator/promotion.data.ts`.

**Tech Stack:** TypeScript, Playwright Test, `APIRequestContext`.

## Global Constraints

- Endpoint create harus `POST /api/v1/promos`.
- Endpoint delete harus `DELETE /api/v1/promos/:id`.
- Token berasal dari argumen atau `YAPP_TEST_ACCESS_TOKEN`; token chat tidak boleh disimpan.
- Tidak menambahkan cleanup, fixture, atau dependency baru.
- Error non-2xx harus menyertakan status dan response body.

---

### Task 1: Add the failing request-shape test

**Files:**
- Create: `tests/helpers/promotion.spec.ts`

**Interfaces:**
- Consumes: `createPromotion(request, options, token?)`.
- Produces: A regression test for the exact endpoint, bearer header, JSON
  payload, and returned response.

- [ ] **Step 1: Write the failing test**

```typescript
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { test, expect } from '../test-base';
import { creatorsBaseURL } from '@config/env';
import { createPromotion, type CreatePromotionOptions } from '@helpers/api/promotion';

test('createPromotion sends the promo payload to the API', { tag: ['@promotions', '@creator', '@smoke'] }, async () => {
  let call: { url: string; options: { headers: Record<string, string>; data: CreatePromotionOptions } } | undefined;
  const responseBody = { data: { uuid: 'promo-1' } };
  const request = {
    post: async (url: string, options: { headers: Record<string, string>; data: CreatePromotionOptions }) => {
      call = { url, options };
      return {
        ok: () => true,
        json: async () => responseBody,
      } as unknown as APIResponse;
    },
  } as unknown as APIRequestContext;
  const payload: CreatePromotionOptions = {
    name: 'test promotion',
    discountType: 'percentage',
    discount: 2,
    code: 'MYMZF86A',
    promoProductType: 'all_product',
    periodStartAt: '2026-07-18T17:00:00.000Z',
    periodEndAt: '2026-07-30T17:00:00.000Z',
    isSetAffiliate: false,
  };

  await expect(createPromotion(request, payload, 'test-token')).resolves.toEqual(responseBody);
  expect(call).toEqual({
    url: expect.stringContaining('/api/v1/promos'),
    options: {
      headers: expect.objectContaining({
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
        Origin: creatorsBaseURL.replace(/\/$/, ''),
        Referer: `${creatorsBaseURL.replace(/\/$/, '')}/`,
        'User-Agent': expect.any(String),
      }),
      data: payload,
    },
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/helpers/promotion.spec.ts --project=chromium`

Expected: FAIL because `@helpers/api/promotion` does not exist yet.

### Task 2: Implement the minimal API helper

**Files:**
- Create: `src/helpers/api/promotion.ts`

**Interfaces:**
- Consumes: Playwright `APIRequestContext`, `CreatePromotionOptions`, and an
  optional bearer token.
- Produces: `createPromotion(request, options, token?): Promise<unknown>`.

- [ ] **Step 1: Add the typed payload and request implementation**

```typescript
import type { APIRequestContext } from '@playwright/test';
import { creatorsBaseURL } from '@config/env';
import { buildBrowserLikeHeaders } from './headers';
import { apiUrl, getHeaders } from './post';

export interface CreatePromotionOptions {
  name: string;
  discountType: string;
  discount: number;
  code: string;
  promoProductType: string;
  periodStartAt: string;
  periodEndAt: string;
  isSetAffiliate: boolean;
}

export async function createPromotion(
  request: APIRequestContext,
  options: CreatePromotionOptions,
  token?: string,
): Promise<unknown> {
  const response = await request.post(apiUrl('/api/v1/promos'), {
    headers: {
      ...getHeaders(token),
      ...buildBrowserLikeHeaders(creatorsBaseURL.replace(/\/$/, '')),
    },
    data: options,
  });

  if (!response.ok()) {
    throw new Error(`Create promotion failed: ${response.status()} ${await response.text()}`);
  }

  return response.json();
}
```

- [ ] **Step 2: Run the focused test to verify it passes**

Run: `npx playwright test tests/helpers/promotion.spec.ts --project=chromium`

Expected: PASS with two tests passed.

### Task 3: Add the delete helper

**Files:**
- Modify: `src/helpers/api/promotion.ts`
- Modify: `tests/helpers/promotion.spec.ts`

**Interfaces:**
- Consumes: Playwright `APIRequestContext`, promo ID, and an optional bearer token.
- Produces: `deletePromotion(request, promotionId, token?): Promise<void>`.

- [ ] **Step 1: Add the minimal delete implementation**

```typescript
export async function deletePromotion(
  request: APIRequestContext,
  promotionId: string,
  token?: string,
): Promise<void> {
  const response = await request.delete(apiUrl(`/api/v1/promos/${encodeURIComponent(promotionId)}`), {
    headers: promotionHeaders(token),
  });

  if (!response.ok()) {
    throw new Error(`Delete promotion failed: ${response.status()} ${await response.text()}`);
  }
}
```

- [ ] **Step 2: Run the focused test to verify it passes**

Run: `npx playwright test tests/helpers/promotion.spec.ts --project=chromium`

Expected: PASS with two tests passed.

### Task 4: Add promotion data factory

**Files:**
- Create: `src/test-data/creator/promotion.data.ts`

**Interfaces:**
- Produces: `generatePromotionData(status?, overrides?): CreatePromotionOptions`.

- [ ] **Step 1: Add the factory**

```typescript
import { faker } from '@faker-js/faker';
import type { CreatePromotionOptions } from '@helpers/api/promotion';

export type PromotionStatus = 'expired' | 'active' | 'inactive';

const DAY_MS = 24 * 60 * 60 * 1000;
const generatedCodes = new Set<string>();
let promotionNameCounter = 0;

function generatePromotionCode(): string {
  let code: string;
  do {
    const letters = faker.string.alpha({ length: 4, casing: 'upper' });
    const numbers = faker.string.numeric(4);
    code = faker.helpers.shuffle([...letters, ...numbers]).join('');
  } while (generatedCodes.has(code));

  generatedCodes.add(code);
  return code;
}

export function generatePromotionData(
  status: PromotionStatus = 'active',
  overrides?: Partial<CreatePromotionOptions>,
): CreatePromotionOptions {
  const now = Date.now();
  const code = generatePromotionCode();
  const name = `promo${String(++promotionNameCounter).padStart(3, '0')}`;
  const periodStartAt = status === 'expired'
    ? new Date(now - 14 * DAY_MS)
    : status === 'inactive'
      ? new Date(now + 7 * DAY_MS)
      : new Date(now);
  const periodEndAt = status === 'expired'
    ? new Date(now - 7 * DAY_MS)
    : new Date(periodStartAt.getTime() + 7 * DAY_MS);

  return {
    name,
    discountType: 'percentage',
    discount: 11,
    code,
    promoProductType: 'all_product',
    periodStartAt: periodStartAt.toISOString(),
    periodEndAt: periodEndAt.toISOString(),
    isSetAffiliate: false,
    ...overrides,
  };
}
```

- [ ] **Step 2: Do not add or run tests for this helper/data change**

Per user instruction, no TC is added and no test command is run.

### Task 5: Verify the repository impact

**Files:**
- Verify: `src/helpers/api/promotion.ts`
- Verify: `src/test-data/creator/promotion.data.ts`

- [ ] **Step 1: Review the diff**

Run: `git diff --check; git status --short`

Expected: no whitespace errors; only the API helper, data factory, and related
design/plan documents are changed. Do not add or run TC tests, and do not stage
or commit because this environment cannot write `.git/index`.
