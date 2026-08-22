import { faker } from '@faker-js/faker';
import { getAiText } from '@test-data/ai';

export type PostVisibility = 'public' | 'pay_per_view' | 'exclusive' | 'member_only';

export interface PostData {
  content: string;
  visibility: PostVisibility;
  price: number;
  isFlexiblePrice: boolean;
  productUuids: string[];
}

export const testImages = {
  claude: 'src/test-data/assets/claude.png',
  gemini: 'src/test-data/assets/gemini.png',
  gpt: 'src/test-data/assets/gpt.png',
  deepseek: 'src/test-data/assets/deepseek.png',
  hermes: 'src/test-data/assets/hermes.jpg',
  openclaw: 'src/test-data/assets/openclaw.png',
  qwen: 'src/test-data/assets/qwen.png',
  /**
   * Gallery fixtures: 600x600 solid colours, each with a marker block in a different
   * corner, so a carousel slide is identifiable in a trace. 600px clears the app's
   * "at least 500 x 500 pixels" rule, and each file is ~2 KB.
   */
  gallery1: 'src/test-data/assets/gallery-1.png',
  gallery2: 'src/test-data/assets/gallery-2.png',
  gallery3: 'src/test-data/assets/gallery-3.png',
} as const;

export const testVideos = {
  sample: 'src/test-data/assets/video.mp4',
} as const;

export function generatePostData(overrides?: Partial<PostData>): PostData {
  return {
    content: getAiText("post:content", () => faker.lorem.sentence()),
    visibility: 'public',
    price: 0,
    isFlexiblePrice: false,
    productUuids: [],
    ...overrides,
  };
}
