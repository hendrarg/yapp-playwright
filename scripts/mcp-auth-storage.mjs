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
 * Sites whose login survives MCP browser restarts. The browser stays `--isolated`
 * (so the yapp `at` cookie always comes fresh from `.env`); these sessions are
 * saved once to `.playwright-mcp/extra-sessions.json` and merged back in.
 */
const extraSessionHosts = ["monkies.monklabs.io"];

export function extraSessionsPath(root) {
  return path.join(root, ".playwright-mcp", "extra-sessions.json");
}

function isExtraSessionHost(hostOrDomain) {
  const host = hostOrDomain.replace(/^\./, "");
  return extraSessionHosts.some((h) => host === h || h.endsWith(`.${host}`) || host.endsWith(`.${h}`));
}

/**
 * Read the saved extra sessions, keeping only cookies and origins of
 * `extraSessionHosts` — anything else in the file (e.g. a yapp cookie captured
 * alongside) is ignored so `.env` stays the only source of the yapp token.
 */
export function loadExtraSessions(root) {
  const file = extraSessionsPath(root);
  if (!fs.existsSync(file)) return { cookies: [], origins: [] };
  try {
    const state = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      cookies: (state.cookies ?? []).filter((c) => isExtraSessionHost(c.domain)),
      origins: (state.origins ?? []).filter((o) => isExtraSessionHost(new URL(o.origin).hostname)),
    };
  } catch (error) {
    console.error(`[playwright-mcp] ignoring unreadable ${file}: ${error.message}`);
    return { cookies: [], origins: [] };
  }
}

/**
 * Writes MCP auth storage state for the account selected by YAPP_MCP_ACCOUNT
 * (default `qa` = YAPP_TEST_ACCESS_TOKEN), plus any saved extra sessions.
 * In `guest` mode the yapp cookie is left out; if there are no extra sessions
 * either, the storage file is removed so the MCP browser starts clean.
 *
 * Returns the output path when written, otherwise null.
 */
export function writeMcpAuthStorageState({
  root,
  baseURL = process.env.YAPP_BASE_URL,
  account = resolveMcpAccount(),
  outputPath = path.join(root, ".playwright-mcp", "auth-storage.json"),
} = {}) {
  const extra = loadExtraSessions(root);
  let state = { cookies: [], origins: [] };

  if (account !== "guest") {
    const envVar = mcpAccounts[account]?.envVar;
    const accessToken = envVar ? process.env[envVar]?.replace(/"/g, "") : undefined;
    if (baseURL && envVar && accessToken) {
      state = buildMcpAuthStorageState(baseURL, accessToken);
    }
  }

  state = { cookies: [...state.cookies, ...extra.cookies], origins: [...state.origins, ...extra.origins] };

  if (!state.cookies.length && !state.origins.length) {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    return null;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(state, null, 2), "utf8");

  return outputPath;
}
