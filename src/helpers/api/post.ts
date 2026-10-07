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
  /** Required for `membership_only`: the tiers that unlock the post. */
  tierMembershipUuids?: string[];
  imagePath?: string;
  mediaPath?: string;
  /** Several images in order — a gallery post. Takes precedence over `imagePath`/`mediaPath`. */
  imagePaths?: string[];
}

/**
 * Create a post via API. Supports text-only, a single uploaded image/video, and multi-image gallery posts.
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
    tierMembershipUuids,
    imagePath,
    mediaPath = imagePath,
    imagePaths,
  } = options;
  const mediaPaths = imagePaths?.length ? imagePaths : mediaPath ? [mediaPath] : [];

  if (!mediaPaths.length) {
    const response = await request.post(apiUrl('/api/v1/posts'), {
      headers: h(),
      data: { content, status: 'active', visibility, assets: [], productUuids, price, isFlexiblePrice, tierMembershipUuids },
    });
    if (!response.ok()) {
      throw new Error(`Create post failed: ${response.status()} ${await response.text()}`);
    }
    const body = await response.json();
    return { postId: body.data?.uuid ?? body.uuid };
  }

  const uploads = [];
  for (const filePath of mediaPaths) uploads.push(await uploadFile(request, { filePath, token, headers: h() }));

  const postRes = await request.post(apiUrl('/api/v1/posts'), {
    headers: h(),
    data: {
      content,
      status: 'active',
      visibility,
      assets: uploads.map((u, order) => ({ url: u.uploadId, assetType: u.assetType, order })),
      productUuids,
      price,
      isFlexiblePrice,
      tierMembershipUuids,
    },
  });
  if (!postRes.ok()) {
    throw new Error(`Step 5 (posts) failed: ${postRes.status()} ${await postRes.text()}`);
  }
  const post = await postRes.json();
  return { postId: post.data?.uuid ?? post.uuid, uploadId: uploads[0].uploadId };
}

/** Engagement fields of `GET /api/v1/posts/{uuid}` as seen by the token's account. */
export interface PostEngagement {
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export async function getPostEngagement(request: APIRequestContext, postId: string, token?: string): Promise<PostEngagement> {
  const response = await request.get(apiUrl(`/api/v1/posts/${postId}`), { headers: getHeaders(token) });
  if (!response.ok()) throw new Error(`Get post failed: ${response.status()} ${await response.text()}`);
  const data = (await response.json()).data ?? {};
  return { likeCount: Number(data.likeCount ?? 0), commentCount: Number(data.commentCount ?? 0), likedByMe: Boolean(data.likedByMe) };
}

/** Visibility of each post the buyer's Exclusive tab lists (`type=exclusive&isPurchasedOnly=true`). */
export async function getPurchasedExclusivePosts(request: APIRequestContext, token?: string): Promise<Array<{ uuid: string; visibility: string }>> {
  const response = await request.get(apiUrl('/api/v1/posts/explore?type=exclusive&isPurchasedOnly=true&page=1&limit=50'), {
    headers: getHeaders(token),
  });
  if (!response.ok()) throw new Error(`Exclusive posts failed: ${response.status()} ${await response.text()}`);
  const list = (await response.json()).data?.data ?? [];
  return list.map((p: { uuid: string; visibility: string }) => ({ uuid: p.uuid, visibility: p.visibility }));
}

/** Whether the token's account may see the post's paid content (`isPurchased` on `GET /api/v1/posts/{uuid}`). */
export async function isPostPurchased(request: APIRequestContext, postId: string, token?: string): Promise<boolean> {
  const response = await request.get(apiUrl(`/api/v1/posts/${postId}`), { headers: getHeaders(token) });
  if (!response.ok()) throw new Error(`Get post failed: ${response.status()} ${await response.text()}`);
  return Boolean((await response.json()).data?.isPurchased);
}

/** Set the token's lifetime (Unlock All) price; 0 turns the offer off. */
export async function setLifetimePrice(request: APIRequestContext, priceIDR: number, token?: string): Promise<void> {
  const response = await request.put(apiUrl('/api/v1/posts/lifetime-prices/me'), { headers: getHeaders(token), data: { priceIDR } });
  if (!response.ok()) throw new Error(`Set lifetime price failed: ${response.status()} ${await response.text()}`);
}

/**
 * Wait until buyers are served the creator's current lifetime offer. `GET /lifetime-prices/{username}/check`
 * (which drives the profile banner) is cached for about a minute after the price changes.
 */
export async function waitForLifetimeOffer(request: APIRequestContext, creatorUsername: string, offered: boolean, token?: string): Promise<void> {
  const deadline = Date.now() + 150_000;
  for (;;) {
    const response = await request.get(apiUrl(`/api/v1/lifetime-prices/${creatorUsername}/check`), { headers: getHeaders(token) });
    if (response.ok() && Boolean((await response.json()).data?.isSet) === offered) return;
    if (Date.now() > deadline) throw new Error(`Lifetime offer of ${creatorUsername} never became ${offered ? 'available' : 'unavailable'}`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

/** Comment on a post as the token's account; returns the comment id. */
export async function createComment(request: APIRequestContext, postId: string, content: string, token?: string): Promise<number> {
  const response = await request.post(apiUrl(`/api/v1/posts/${postId}/comments`), {
    headers: getHeaders(token),
    data: { postUUID: postId, content },
  });
  if (!response.ok()) throw new Error(`Create comment failed: ${response.status()} ${await response.text()}`);
  return (await response.json()).data.id;
}

/**
 * Replace a post's fields via `PUT /api/v1/posts/{uuid}`. The update replaces the asset list, so pass the
 * `uploadId` returned by {@link createPost} to keep the media; asset URLs from a GET are signed and are rejected.
 */
export async function updatePost(
  request: APIRequestContext,
  postId: string,
  options: Omit<CreatePostOptions, 'imagePath' | 'mediaPath'> & { uploadId?: string; assetType?: string },
  token?: string,
): Promise<void> {
  const { content, visibility, price = 0, isFlexiblePrice = false, productUuids = [], uploadId, assetType = 'image' } = options;
  const response = await request.put(apiUrl(`/api/v1/posts/${postId}`), {
    headers: getHeaders(token),
    data: {
      content,
      status: 'active',
      visibility,
      assets: uploadId ? [{ url: uploadId, assetType, order: 0 }] : [],
      productUuids,
      price,
      isFlexiblePrice,
    },
  });
  if (!response.ok()) throw new Error(`Update post failed: ${response.status()} ${await response.text()}`);
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
