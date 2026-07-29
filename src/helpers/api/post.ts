import type { APIRequestContext } from '@playwright/test';
import { apiUrl, getHeaders } from '@helpers/api/client';
import { uploadFile } from '@helpers/api/upload';
import type { PostVisibility } from '@test-data/creator/post.data';

export interface CreatePostOptions {
  content: string;
  visibility: PostVisibility;
  price?: number;
  isFlexiblePrice?: boolean;
  productUuids?: string[];
  imagePath?: string;
  mediaPath?: string;
}

/**
 * Create a post via API. Supports text-only and uploaded image/video posts.
 */
export async function createPost(
  request: APIRequestContext,
  options: CreatePostOptions,
  token?: string,
): Promise<{ postId: string; uploadId?: string }> {
  const h = () => getHeaders(token);
  const {
    content,
    visibility,
    price = 0,
    isFlexiblePrice = false,
    productUuids = [],
    imagePath,
    mediaPath = imagePath,
  } = options;

  if (!mediaPath) {
    const response = await request.post(apiUrl('/api/v1/posts'), {
      headers: h(),
      data: { content, status: 'active', visibility, assets: [], productUuids, price, isFlexiblePrice },
    });
    if (!response.ok()) {
      throw new Error(`Create post failed: ${response.status()} ${await response.text()}`);
    }
    const body = await response.json();
    return { postId: body.data?.uuid ?? body.uuid };
  }

  const uploaded = await uploadFile(request, {
    filePath: mediaPath,
    token,
    headers: h(),
  });

  const postRes = await request.post(apiUrl('/api/v1/posts'), {
    headers: h(),
    data: {
      content,
      status: 'active',
      visibility,
      assets: [{ url: uploaded.uploadId, assetType: uploaded.assetType, order: 0 }],
      productUuids,
      price,
      isFlexiblePrice,
    },
  });
  if (!postRes.ok()) {
    throw new Error(`Step 5 (posts) failed: ${postRes.status()} ${await postRes.text()}`);
  }
  const post = await postRes.json();
  return { postId: post.data?.uuid ?? post.uuid, uploadId: uploaded.uploadId };
}

export async function deletePost(
  request: APIRequestContext,
  postId: string,
  token?: string,
): Promise<void> {
  const response = await request.delete(apiUrl(`/api/v1/posts/${postId}`), {
    headers: getHeaders(token),
  });
  if (!response.ok()) {
    throw new Error(`Delete post failed: ${response.status()} ${await response.text()}`);
  }
}
