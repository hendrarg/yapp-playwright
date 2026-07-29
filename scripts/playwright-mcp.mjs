import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { config as loadEnv } from "dotenv";
import { applyPlaywrightBrowsersPath } from "../config/playwright-browsers-path.mjs";
import { writeMcpAuthStorageState } from "./mcp-auth-storage.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: path.join(root, ".env") });

applyPlaywrightBrowsersPath();

const mcpCli = path.join(root, "node_modules", "@playwright", "mcp", "cli.js");
const args = ["--browser=chromium", "--viewport-size=1440,900"];

const authStoragePath = writeMcpAuthStorageState({ root });
if (authStoragePath) {
  args.push(`--storage-state=${authStoragePath}`);
} else {
  console.error(
    "[playwright-mcp] YAPP_TEST_ACCESS_TOKEN not set; MCP browser starts unauthenticated.",
  );
}

const child = spawn(process.execPath, [mcpCli, ...args], {
  stdio: "inherit",
  cwd: root,
  env: process.env,
  windowsHide: true,
});

child.on("error", (error) => {
  console.error(`[playwright-mcp] failed to start: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
