import { faker } from "@faker-js/faker";
import { testImages } from "@test-data/creator/post.data";

export const profileCustomizationData = {
  profilePicturePath: testImages.claude,
  bannerPath: testImages.gemini,
} as const;

export function generateProfileName(): string {
  return `QA ${faker.person.firstName()} ${Date.now().toString().slice(-4)}`;
}

export function generateProfileBio(): string {
  return `QA bio ${faker.lorem.words(4)} ${Date.now().toString().slice(-4)}`;
}

/** A handle for a social platform: letters, digits and underscores only. */
export function generateSocialHandle(): string {
  return `qa_${faker.string.alphanumeric({ length: 6, casing: "lower" })}`;
}

/** A valid, unused Link (username): 4–25 chars of lowercase letters, digits and underscores. */
export function generateProfileLink(): string {
  return `qa_${faker.string.alphanumeric({ length: 8, casing: "lower" })}`;
}

export const themePresets = ["Default", "Sunset", "Ocean", "Forest", "Midnight"] as const;
export type ThemePreset = (typeof themePresets)[number];

export const layoutOptions = ["Default", "Simple"] as const;
export type LayoutOption = (typeof layoutOptions)[number];

/**
 * Custom colours the theme accepts. The app silently ignores a colour too close in contrast to the
 * other two (e.g. a background equal to the primary), so each value is far from the others — and
 * from the presets, so saving them is a real change.
 */
export const customColors = {
  background: "#FAFAFA",
  primary: "#D7263D",
  secondary: "#22223B",
} as const;

/** Not hex colours: kept verbatim in the field, never applied, Save stays disabled. */
export const invalidColors = ["zzzzzz", "#GGGGGG", "#12", "red"] as const;
/** A primary far enough from `customColors.background` to be accepted. */
export const validColorForPrimary = "#1D4ED8";

export const roleOptions = [
  "Artist",
  "Content Creator",
  "Community",
  "Educator",
  "Entrepreneur",
  "Streamer",
  "Musician/band",
  "Product Designer",
  "Software Developer",
  "Others",
] as const;

export const bioLimit = 200;

export const profileDialogs = {
  /** "For Best Results" copy — identical on both upload dialogs (that is the L-53 defect). */
  guidance: ["Use images wider than 1080px", "Maximum file size: 20MB", "Recommended aspect ratio: 1:1"],
  /** What each control actually produces from a large source image. */
  cropOutput: { picture: { width: 600, height: 600 }, banner: { width: 900, height: 506 } },
} as const;

export const tipButtonData = {
  label: "Support Me",
  labelMaxChars: 40,
  overflowLabel: "Support Me! This is a very long button text exceeding forty characters",
  idrAmount1: "15,000",
  idrAmount2: "75,000",
  idrAmount3: "300,000",
  usdtAmount1: "15",
  usdtAmount2: "75",
  usdtAmount3: "300",
} as const;

/** Quick amounts written by the profile tests; the buyer tip page shows the IDR ones as chips. */
export const quickAmountEdits = {
  idr: ["12,000", "34,000", "56,000"],
  idrChips: ["Rp12.000", "Rp34.000", "Rp56.000"],
  usdt: ["7", "8", "9"],
} as const;

export const tipButtonColors = {
  text: "#FFD700",
  left: "#8B0000",
  right: "#006400",
} as const;

export function generateTipLabel(): string {
  return `QA Tip ${Date.now().toString().slice(-5)}`;
}

/** Text block editor (My Page → Links → Add Block → Text). */
export const textBlockData = {
  suggestedTiles: ["Folder", "Link", "Campaign", "Text"],
  toolbar: ["Bold", "Underline", "Clear formatting", "Bulleted list", "Numbered list", "Align left", "Align center", "Align right", "Justify", "HTML code view"],
  absentControls: ["italic", "color", "font size"],
  tableHtml: "<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>",
  tableCells: ["A", "B", "1", "2"],
  maliciousHtml:
    '<p>SAFE_TEXT</p><script>window.__pwned=1</script><style>p{}</style><iframe src="https://example.com">IFRAME_TEXT</iframe>' +
    '<img src=x onerror="window.__img=1"><a href="https://evil.example">EVILLINK</a><button onclick="window.__btn=1">BTN_TEXT</button>' +
    '<p style="color:red" onmouseover="x()">STYLED</p><i>ITALIC_TEXT</i><b>BOLD_TEXT</b><u>UNDER_TEXT</u>' +
    "<h2>HEAD_TEXT</h2><ul><li>LIST_TEXT</li></ul><table><tbody><tr><td>CELL_TEXT</td></tr></tbody></table>",
  /** Tags the server must strip on save, while keeping their inner text. */
  strippedTags: ["<script", "<style", "<iframe", "<img", "<a ", "<button", "onerror", "onclick", "onmouseover", "style=", "<i>"],
  keptTags: ["<b>", "<u>", "<h2>", "<ul>", "<li>", "<table>", "<td>"],
  keptTexts: ["SAFE_TEXT", "EVILLINK", "BTN_TEXT", "STYLED", "ITALIC_TEXT", "BOLD_TEXT"],
  emptyContents: ["", "   ", "<p>   </p>"],
} as const;

export function generateTextBlockContent() {
  const stamp = Date.now().toString().slice(-5);
  return { heading: `QA heading ${stamp}`, bold: `QA bold ${stamp}`, items: [`QA item one ${stamp}`, `QA item two ${stamp}`] };
}

/** Quick-action label My Page shows for each tool slug in `creator-favorites`. */
export const toolLabels: Record<string, string> = {
  livestream: "Livestream",
  digital_download: "Digital Download",
  membership: "Membership",
  online_course: "Online Course",
  telegram_membership: "Telegram Membership",
  discord_membership: "Discord Membership",
  consultation: "Consultation",
  event: "Event & Tickets",
};

export const myPageTabs = ["Links", "Products", "Feeds", "Memberships"] as const;
