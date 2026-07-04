import type { APIRequestContext } from '@playwright/test';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { apiBaseURL } from '@config/env';
import type { PostVisibility } from '@test-data/creator/post.data';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

export interface CreatePostOptions {
  content: string;
  visibility: PostVisibility;
  price?: number;
  isFlexiblePrice?: boolean;
  productUuids?: string[];
  imagePath?: string;
}

export function apiUrl(path: string) {
  return `${apiBaseURL.replace(/\/$/, '')}${path}`;
}

export function getHeaders() {
  const token = (process.env.YAPP_TEST_ACCESS_TOKEN ?? '').replace(/^"|"$/g, '');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Origin: 'https://yapp-dev.yapp.ink',
    Referer: 'https://yapp-dev.yapp.ink/',
  };
}

/**
 * Create a post via API. Supports text-only and image posts.
 *
 * Text-only: directly POST /api/v1/posts with empty assets.
 * Image: 4-step upload flow:
 *   1. create  → POST /file/upload/create   → {uploadId, key}
 *   2. sign    → GET  /file/upload/sign      → presigned S3 URL
 *   3. PUT     → upload file binary to S3     → S3 response headers (ETag)
 *   4. complete → POST /file/upload/complete → finalize with ETag
 *   5. posts   → POST /api/v1/posts          → create post
 */
export async function createPost(
  request: APIRequestContext,
  options: CreatePostOptions
): Promise<{ postId: string; uploadId?: string }> {
  const { content, visibility, price = 0, isFlexiblePrice = false, productUuids = [], imagePath } = options;

  if (!imagePath) {
    const response = await request.post(apiUrl('/api/v1/posts'), {
      headers: getHeaders(),
      data: { content, status: 'active', visibility, assets: [], productUuids, price, isFlexiblePrice },
    });
    if (!response.ok()) {
      throw new Error(`Create post failed: ${response.status()} ${await response.text()}`);
    }
    const body = await response.json();
    return { postId: body.data?.uuid ?? body.uuid };
  }

  // ── Image upload flow ──
  const ext = imagePath.split('.').pop() ?? 'jpeg';
  const filename = imagePath.split('/').pop() ?? `${randomUUID()}.${ext}`;
  const filetype = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' || ext === 'jfif' ? 'image/jpeg' : 'image/jpeg';

  // Step 1: Create upload
  const createRes = await request.post(apiUrl('/api/v1/file/upload/create'), {
    headers: getHeaders(),
    data: { filename, filetype },
  });
  if (!createRes.ok()) {
    throw new Error(`Step 1 (create) failed: ${createRes.status()} ${await createRes.text()}`);
  }
  const createBody = await createRes.json();
  const uploadId = createBody.uploadId ?? createBody.data?.uploadId;
  const key = createBody.key ?? createBody.data?.key;

  // Step 2: Get presigned S3 URL
  const signUrl = apiUrl(`/api/v1/file/upload/sign?uploadId=${encodeURIComponent(uploadId)}&key=${encodeURIComponent(key)}&partNumber=1`);
  const signRes = await request.get(signUrl, {
    headers: { ...getHeaders(), 'Content-Type': undefined as any },
  });
  if (!signRes.ok()) {
    throw new Error(`Step 2 (sign) failed: ${signRes.status()} ${await signRes.text()}`);
  }
  const signBody = await signRes.json();
  const presignedUrl = signBody.url ?? signBody.data?.url ?? signBody.presignedUrl;

  // Step 3: Upload file to S3 via presigned URL
  const resolvedPath = path.isAbsolute(imagePath) ? imagePath : path.resolve(PROJECT_ROOT, imagePath);
  const imageBuffer = fs.readFileSync(resolvedPath);
  const putRes = await request.put(presignedUrl, {
    headers: { 'Content-Type': filetype },
    data: imageBuffer,
  });
  if (!putRes.ok()) {
    throw new Error(`Step 3 (S3 PUT) failed: ${putRes.status()}`);
  }
  const s3Headers = putRes.headers();

  // Step 4: Complete upload
  const parts = [{
    PartNumber: 1,
    ETag: s3Headers['etag'],
    'x-amz-id-2': s3Headers['x-amz-id-2'],
    'x-amz-request-id': s3Headers['x-amz-request-id'],
    'x-amz-server-side-encryption': s3Headers['x-amz-server-side-encryption'],
    'content-length': String(imageBuffer.length),
  }];

  const completeRes = await request.post(apiUrl('/api/v1/file/upload/complete'), {
    headers: getHeaders(),
    data: { uploadId, key, parts },
  });
  if (!completeRes.ok()) {
    throw new Error(`Step 4 (complete) failed: ${completeRes.status()} ${await completeRes.text()}`);
  }

  // Step 5: Create post
  const postRes = await request.post(apiUrl('/api/v1/posts'), {
    headers: getHeaders(),
    data: {
      content,
      status: 'active',
      visibility,
      assets: [{ url: uploadId, assetType: 'image', order: 0 }],
      productUuids,
      price,
      isFlexiblePrice,
    },
  });
  if (!postRes.ok()) {
    throw new Error(`Step 5 (posts) failed: ${postRes.status()} ${await postRes.text()}`);
  }
  const post = await postRes.json();
  return { postId: post.data?.uuid ?? post.uuid, uploadId };
}
