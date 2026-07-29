import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { applyPlaywrightBrowsersPath } from "../config/playwright-browsers-path.mjs";

// Ensure MCP uses the stable user browser cache, not Cursor sandbox Temp.
applyPlaywrightBrowsersPath();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mcpCli = path.join(root, "node_modules", "@playwright", "mcp", "cli.js");

const child = spawn(
  process.execPath,
  [mcpCli, "--browser=chromium", "--viewport-size=1440,900"],
  {
    // Must share stdio with Cursor — MCP speaks JSON-RPC over stdin/stdout.
    stdio: "inherit",
    cwd: root,
    env: process.env,
    windowsHide: true,
  },
);

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
