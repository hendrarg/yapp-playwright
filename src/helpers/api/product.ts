import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';
import { apiUrl, getHeaders } from '@helpers/api/client';
import { uploadFile } from '@helpers/api/upload';

export type ProductStatus = 'active' | 'inactive' | 'draft';

export interface OnlineCoursePage {
  videoUrl: string;
  videoThumbnail: string;
  thumbnailType: string;
  pageName: string;
  content: string;
  position: number;
  files: unknown[];
}

export interface OnlineCourseChapter {
  chapterName: string;
  position: number;
  pages: OnlineCoursePage[];
}

export interface CreateOnlineCourseProductOptions {
  title: string;
  description: string;
  thumbnailImagePath: string;
  price?: number;
  status?: ProductStatus;
  pages?: OnlineCourseChapter[];
  productImages?: string[];
  additionalQuestions?: unknown[];
  categoryIDs?: string[];
  purchaseButtonText?: string;
  privateDescription?: string;
  thankYouNote?: string;
}

export interface CreatedProduct {
  productUuid: string;
  uploadId: string;
  key: string;
  body: unknown;
}

function creatorOrigin() {
  return (process.env.YAPP_CREATORS_BASE_URL ?? 'https://creators-dev.yapp.ink').replace(/\/$/, '');
}

function getCreatorHeaders(token?: string) {
  const origin = creatorOrigin();
  return {
    ...getHeaders(token, origin),
    'x-origin': origin,
  };
}

function defaultOnlineCoursePages(): OnlineCourseChapter[] {
  return [
    {
      chapterName: 'Chapter title',
      position: 1,
      pages: [
        {
          videoUrl: '',
          videoThumbnail: '',
          thumbnailType: '',
          pageName: 'New Episode',
          content: '',
          position: 1,
          files: [],
        },
      ],
    },
  ];
}

function productUuidFromBody(body: any): string | undefined {
  return body.data?.uuid ?? body.data?.product?.uuid ?? body.uuid ?? body.product?.uuid;
}

export async function createOnlineCourseProduct(
  request: APIRequestContext,
  options: CreateOnlineCourseProductOptions,
  token?: string,
): Promise<CreatedProduct> {
  const headers = getCreatorHeaders(token);
  const uploaded = await uploadFile(request, {
    filePath: options.thumbnailImagePath,
    token,
    headers,
  });

  const response = await request.post(apiUrl('/api/v1/shop/products'), {
    headers,
    data: {
      title: options.title,
      description: options.description,
      thumbnailImage: uploaded.uploadId,
      productImages: options.productImages ?? [],
      isSetPrice: true,
      price: options.price ?? 0,
      isSetDiscount: false,
      discount: 0,
      discountType: 'percentage',
      isFlexiblePrice: false,
      maximumFlexiblePrice: null,
      isSchedulePublish: false,
      isHideFromExplore: false,
      isAvailability: false,
      status: options.status ?? 'active',
      pages: options.pages ?? defaultOnlineCoursePages(),
      additionalQuestions: options.additionalQuestions ?? [],
      contentSetting: {
        isDownloadable: false,
        isRequireLoginToPurchase: false,
        isNSFW: false,
        isBlurContent: false,
        isOneTimeView: false,
      },
      isAllowCustomerChooseQuantity: false,
      isLimitProductSales: false,
      limitProductSales: 0,
      isEnableCrypto: false,
      isCryptoFlexiblePrice: false,
      categoryIDs: options.categoryIDs ?? [],
      isAcceptPublicAffiliator: false,
      affiliateCommissionType: 'percentage',
      affiliateCommission: 0,
      affiliateCommissionCrypto: 0,
      isFreeForMembers: false,
      purchaseButtonText: options.purchaseButtonText ?? 'Purchase',
      privateDescription: options.privateDescription ?? '',
      thankYouNote: options.thankYouNote ?? '',
      salesLinks: [],
      productType: 'online_course',
    },
  });
  if (!response.ok()) {
    throw new Error(`Create online course product failed: ${response.status()} ${await response.text()}`);
  }

  const body = await response.json();
  const productUuid = productUuidFromBody(body);
  if (!productUuid) {
    throw new Error(`Create online course product response did not include product uuid: ${JSON.stringify(body)}`);
  }

  return {
    productUuid,
    uploadId: uploaded.uploadId,
    key: uploaded.key,
    body,
  };
}

export async function deleteProduct(
  request: APIRequestContext,
  productUuid: string,
  token?: string,
): Promise<void> {
  const response = await request.delete(apiUrl(`/api/v1/shop/products/${productUuid}`), {
    headers: getCreatorHeaders(token),
  });
  if (!response.ok()) {
    throw new Error(`Delete product failed: ${response.status()} ${await response.text()}`);
  }
}

export async function setProductHideFromProfile(
  request: APIRequestContext,
  productUuid: string,
  isHideFromProfile: boolean,
  token?: string,
) {
  const response = await request.put(apiUrl(`/api/v1/shop/products/${productUuid}/hide-from-profile`), {
    headers: getCreatorHeaders(token),
    data: { isHideFromProfile },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

export async function expectProductHideFromProfile(
  request: APIRequestContext,
  productUuid: string,
  isHideFromProfile: boolean,
  token?: string,
) {
  const response = await request.get(apiUrl(`/api/v1/shop/products/${productUuid}`), {
    headers: getCreatorHeaders(token),
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json();
  expect(body.data.isHideFromProfile).toBe(isHideFromProfile);
}

export async function expectProductStatus(
  request: APIRequestContext,
  productUuid: string,
  status: ProductStatus,
  token?: string,
) {
  const response = await request.get(apiUrl(`/api/v1/shop/products/${productUuid}`), {
    headers: getCreatorHeaders(token),
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json();
  expect(body.data.status).toBe(status);
}
