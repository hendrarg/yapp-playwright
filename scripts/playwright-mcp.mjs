import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { applyPlaywrightBrowsersPath } from "../config/playwright-browsers-path.mjs";

// Ensure MCP uses the stable user browser cache, not Cursor sandbox Temp.
applyPlaywrightBrowsersPath();

const require = createRequire(import.meta.url);
const mcpCli = require.resolve("@playwright/mcp/cli.js");

const child = spawn(
  process.execPath,
  [mcpCli, "--browser=chromium", "--viewport-size=1440,900"],
  {
    stdio: "inherit",
    env: process.env,
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
