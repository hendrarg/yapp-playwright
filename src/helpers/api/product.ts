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
  /** Additional gallery image paths shown in the buyer carousel. Uploaded as product images. */
  productImagePaths?: string[];
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

export interface CreateConsultationProductOptions {
  title: string;
  description: string;
  thumbnailImagePath: string;
  /** Additional gallery image paths (buyer carousel). Defaults to 10 copies of the thumbnail. */
  productImagePaths?: string[];
  price?: number;
  status?: ProductStatus;
  minimumNoticeValue?: number;
  minimumNoticeUnit?: 'hours' | 'days';
  appointmentDurationValue?: number;
  appointmentDurationUnit?: 'minutes' | 'hours';
  timezone?: string;
  availabilityRangeValue?: number;
  availabilityRangeUnit?: 'months' | 'weeks';
  /** Lowercase weekday, e.g. `monday`. Defaults to today. */
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
}

export interface CreatedConsultationProduct extends CreatedProduct {
  shortUrl: string;
  sharePath: string;
}

const WEEKDAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export async function createConsultationProduct(
  request: APIRequestContext,
  options: CreateConsultationProductOptions,
  token?: string,
): Promise<CreatedConsultationProduct> {
  const headers = getCreatorHeaders(token);
  const thumbnail = await uploadFile(request, {
    filePath: options.thumbnailImagePath,
    token,
    headers,
  });

  const galleryPaths =
    options.productImagePaths ??
    Array.from({ length: 10 }, () => options.thumbnailImagePath);
  const galleryUploads: { uploadId: string }[] = [];
  for (const filePath of galleryPaths) {
    galleryUploads.push(
      await uploadFile(request, {
        filePath,
        token,
        headers,
      }),
    );
  }

  const dayOfWeek = options.dayOfWeek ?? WEEKDAY_NAMES[new Date().getDay()];
  const response = await request.post(apiUrl('/api/v1/shop/products'), {
    headers,
    data: {
      title: options.title,
      description: options.description,
      shortUrl: '',
      thumbnailImage: thumbnail.uploadId,
      productImages: galleryUploads.map((upload) => ({
        title: '',
        description: '',
        feedAssetType: 'image',
        url: upload.uploadId,
        uuid: '',
      })),
      isSetPrice: true,
      price: options.price ?? 15000,
      isSetDiscount: false,
      discount: 0,
      discountType: '',
      isFlexiblePrice: false,
      minimumFlexiblePrice: 0,
      status: options.status ?? 'active',
      consultationConfig: {
        appointmentDurationValue: options.appointmentDurationValue ?? 60,
        appointmentDurationUnit: options.appointmentDurationUnit ?? 'minutes',
        minimumNoticeValue: options.minimumNoticeValue ?? 1,
        minimumNoticeUnit: options.minimumNoticeUnit ?? 'hours',
        isBufferTimeEnabled: false,
        bufferTimeBeforeValue: 0,
        bufferTimeBeforeUnit: 'minutes',
        bufferTimeAfterValue: 0,
        bufferTimeAfterUnit: 'minutes',
        isLimitBookingFrequencyEnabled: false,
        limitBookingFrequencyValue: 1,
        limitBookingFrequencyUnit: 'perday',
        timezone: options.timezone ?? 'Asia/Jakarta',
        availabilityRangeValue: options.availabilityRangeValue ?? 3,
        availabilityRangeUnit: options.availabilityRangeUnit ?? 'months',
        allowReschedule: false,
      },
      consultationWeeklyRules: {
        availability: [
          {
            dayOfWeek,
            timeSlots: [
              {
                startTime: options.startTime ?? '09:00',
                endTime: options.endTime ?? '17:00',
              },
            ],
          },
        ],
      },
      isAllowCustomerChooseQuantity: false,
      isLimitProductSales: false,
      isSchedulePublish: false,
      isAvailability: false,
      additionalQuestions: [],
      thankYouNote: '',
      salesLinks: [],
      maximumFlexiblePrice: null,
      productType: 'appointment',
    },
  });
  if (!response.ok()) {
    throw new Error(`Create consultation product failed: ${response.status()} ${await response.text()}`);
  }

  const body = await response.json();
  const productUuid = productUuidFromBody(body);
  if (!productUuid) {
    throw new Error(`Create consultation product response did not include product uuid: ${JSON.stringify(body)}`);
  }

  const shortUrl =
    body.data?.shortUrl ?? body.data?.product?.shortUrl ?? body.shortUrl;
  if (!shortUrl || typeof shortUrl !== 'string') {
    throw new Error(`Create consultation product response did not include shortUrl: ${JSON.stringify(body)}`);
  }

  return {
    productUuid,
    uploadId: thumbnail.uploadId,
    key: thumbnail.key,
    body,
    shortUrl,
    sharePath: `/s/${shortUrl}`,
  };
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

  const galleryUploads: { uploadId: string }[] = [];
  for (const filePath of options.productImagePaths ?? []) {
    galleryUploads.push(
      await uploadFile(request, {
        filePath,
        token,
        headers,
      }),
    );
  }

  const response = await request.post(apiUrl('/api/v1/shop/products'), {
    headers,
    data: {
      title: options.title,
      description: options.description,
      thumbnailImage: uploaded.uploadId,
      productImages: galleryUploads.map((upload) => ({
        title: '',
        description: '',
        feedAssetType: 'image',
        url: upload.uploadId,
        uuid: '',
      })),
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
