import { faker } from "@faker-js/faker";
import { getAiText } from "@test-data/ai";
import { testImages } from "@test-data/creator/post.data";

/** Media / thumbnail data for Events and Tickets create (AUT-FV-312). */
export const eventsMediaData = {
  heroImagePath: testImages.claude,
  galleryImagePath: testImages.qwen,
  tinyImagePath: "src/test-data/assets/tiny-1x1.png",
  tinyFileName: "tiny-1x1.png",
  oneAxisUndersizedPath: "src/test-data/assets/undersized-686x447.png",
  oneAxisUndersizedFileName: "undersized-686x447.png",
  acceptList: "image/jpeg,.jpeg,.jpg,image/png,.png,image/gif,.gif,image/webp,.webp",
  helperText:
    "Upload the image for your product details. Image should be at least 500 × 500 pixels and smaller than 500 MB.",
  thumbnailRequired: "Thumbnail is required",
  heroDropHint: "Upload File",
  galleryChooserCopy: "select from gallery or drag and drop",
  emptyGalleryNoImageCount: 9,
  gallerySlotCount: 10,
  afterOneUploadNoImageCount: 8,
} as const;

export function generateEventsTitle(): string {
  return getAiText("product:name", () => faker.commerce.productName());
}

export function generateEventsDescription(): string {
  return getAiText("product:description", () => faker.lorem.sentence());
}
