import os from "node:os";
import path from "node:path";

/**
 * Cursor agent sandboxes set PLAYWRIGHT_BROWSERS_PATH to a Temp cache that is
 * empty on every new sandbox id — causing repeated Chromium downloads.
 * Prefer the stable per-user Playwright cache instead.
 */
export function resolvePlaywrightBrowsersPath(current = process.env.PLAYWRIGHT_BROWSERS_PATH) {
  const explicit = process.env.YAPP_PLAYWRIGHT_BROWSERS_PATH;
  if (explicit) return explicit;

  if (current && !current.includes("cursor-sandbox-cache")) {
    return current;
  }

  if (process.platform === "win32") {
    return path.join(
      process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"),
      "ms-playwright",
    );
  }

  return path.join(os.homedir(), ".cache", "ms-playwright");
}

export function applyPlaywrightBrowsersPath() {
  process.env.PLAYWRIGHT_BROWSERS_PATH = resolvePlaywrightBrowsersPath();
  return process.env.PLAYWRIGHT_BROWSERS_PATH;
}
