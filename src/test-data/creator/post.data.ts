import { faker } from '@faker-js/faker';

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
  deepseek: 'src/test-data/assets/deepseek.jfif',
  hermes: 'src/test-data/assets/hermes.jpg',
  katana: 'src/test-data/assets/katana.jpg',
  openclaw: 'src/test-data/assets/openclaw.jfif',
  qwen: 'src/test-data/assets/qwen.png',
  warkopi: 'src/test-data/assets/warkopi.jpg',
} as const;

export function generatePostData(overrides?: Partial<PostData>): PostData {
  return {
    content: faker.lorem.sentence(),
    visibility: 'public',
    price: 0,
    isFlexiblePrice: false,
    productUuids: [],
    ...overrides,
  };
}
