import { faker } from "@faker-js/faker";
import { testImages } from "@test-data/creator/post.data";

export const profileCustomizationData = {
  profilePicturePath: testImages.claude,
  bannerPath: testImages.gemini,
} as const;

export function generateProfileName(): string {
  return faker.person.fullName();
}

export function generateProfileBio(): string {
  return faker.lorem.sentence();
}

export function generateProfileSocialLink(): string {
  return `https://instagram.com/${faker.internet.username()}`;
}

export function generateProfileLink(): string {
  return faker.internet.username().toLowerCase().replace(/[^a-z0-9_]/g, "_");
}

export function generateProfileRole(): string {
  return faker.person.jobTitle();
}

export function generateProfileInterest(): string {
  return faker.lorem.word();
}

export type ProfileFormState = {
  name: string;
  bio: string;
  socialLink: string;
  link: string;
  role: string;
  interest: string;
};

export function generateProfileFormState(): ProfileFormState {
  return {
    name: generateProfileName(),
    bio: generateProfileBio(),
    socialLink: generateProfileSocialLink(),
    link: generateProfileLink(),
    role: generateProfileRole(),
    interest: generateProfileInterest(),
  };
}

export const themePresets = [
  "Default",
  "Sunset",
  "Ocean",
  "Forest",
  "Midnight",
] as const;

export type ThemePreset = (typeof themePresets)[number];

export const layoutOptions = ["Default", "Simple"] as const;

export type LayoutOption = (typeof layoutOptions)[number];

export const customColors = {
  background: "#1A1A2E",
  primary: "#E94560",
  secondary: "#0F3460",
} as const;
