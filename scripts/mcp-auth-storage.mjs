import fs from "node:fs";
import path from "node:path";

function apexDomain(url) {
  return new URL(url).hostname.replace(/^[^.]+\./, ".");
}

/**
 * Build Playwright storage state with the shared `at` cookie used by auth fixtures.
 */
export function buildMcpAuthStorageState(baseURL, accessToken) {
  return {
    cookies: [
      {
        name: "at",
        value: accessToken,
        domain: apexDomain(baseURL),
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: true,
        sameSite: "Lax",
      },
    ],
    origins: [],
  };
}

/**
 * Writes MCP auth storage state when YAPP_TEST_ACCESS_TOKEN is available.
 * Returns the output path when written, otherwise null.
 */
export function writeMcpAuthStorageState({
  root,
  baseURL = process.env.YAPP_BASE_URL,
  accessToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, ""),
  outputPath = path.join(root, ".playwright-mcp", "auth-storage.json"),
} = {}) {
  if (!baseURL || !accessToken) {
    return null;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    JSON.stringify(buildMcpAuthStorageState(baseURL, accessToken), null, 2),
    "utf8",
  );

  return outputPath;
}
