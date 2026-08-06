import fs from "node:fs";
import path from "node:path";

function apexDomain(url) {
  return new URL(url).hostname.replace(/^[^.]+\./, ".");
}

/**
 * Account presets for the MCP browser session. Mirrors src/test-data/users.ts.
 */
export const mcpAccounts = {
  qa: {
    label: "QA Tester (token1)",
    envVar: "YAPP_TEST_ACCESS_TOKEN",
  },
  sundanese: {
    label: "Sundanese buyer (token2)",
    envVar: "YAPP_TEST_ACCESS_TOKEN_2",
  },
};

/**
 * Resolve which account the MCP browser authenticates as from YAPP_MCP_ACCOUNT.
 * Values: `qa` (default), `sundanese`, or `guest`/`none` for an unauthenticated session.
 */
export function resolveMcpAccount(account = process.env.YAPP_MCP_ACCOUNT?.toLowerCase()) {
  if (!account || account === "qa" || account === "token1") return "qa";
  if (account === "sundanese" || account === "token2") return "sundanese";
  if (account === "guest" || account === "none" || account === "off") return "guest";
  throw new Error(
    `Unknown YAPP_MCP_ACCOUNT value "${account}". Use "qa", "sundanese", or "guest".`,
  );
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
 * Writes MCP auth storage state for the account selected by YAPP_MCP_ACCOUNT
 * (default `qa` = YAPP_TEST_ACCESS_TOKEN). In `guest` mode the storage file is
 * removed so the MCP browser starts unauthenticated.
 *
 * Returns the output path when written, otherwise null.
 */
export function writeMcpAuthStorageState({
  root,
  baseURL = process.env.YAPP_BASE_URL,
  account = resolveMcpAccount(),
  outputPath = path.join(root, ".playwright-mcp", "auth-storage.json"),
} = {}) {
  if (account === "guest") {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    return null;
  }

  const envVar = mcpAccounts[account]?.envVar;
  const accessToken = envVar ? process.env[envVar]?.replace(/"/g, "") : undefined;
  if (!baseURL || !envVar || !accessToken) {
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
