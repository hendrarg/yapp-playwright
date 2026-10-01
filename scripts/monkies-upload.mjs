/**
 * Upload images to Monkies without a browser and print the asset URLs to embed
 * in a card (description or comment) through the Monkies MCP.
 *
 * Monkies' own editor does exactly two requests per file, replayed here:
 *   1. POST {MONKIES}/api/go/asset/sign  {workspaceId, contentType}  (session cookie)
 *      → a presigned DigitalOcean Spaces POST form (`uploadUrl` + `fields` + `key`)
 *   2. POST the form fields + file to `uploadUrl`  → 204
 * The card then references `/api/go/asset/object?key=<encoded key>`.
 *
 * Auth comes from the saved web session in `.playwright-mcp/extra-sessions.json`
 * (see `.agents/rules/mcp-playwright.md` → "Saved logins for other sites").
 *
 * Usage:
 *   node scripts/monkies-upload.mjs <file.png> [more files…]
 *   node scripts/monkies-upload.mjs --workspace <id> <files…>
 *   node scripts/monkies-upload.mjs --json <files…>      # machine-readable output
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extraSessionsPath, loadExtraSessions } from "./mcp-auth-storage.mjs";

const MONKIES = "https://monkies.monklabs.io";
/** Workspace "Yapp" (from list_workspaces, 30 Sep 2026). Override with --workspace or MONKIES_WORKSPACE_ID. */
const DEFAULT_WORKSPACE = "33745fc3-dd8e-4a15-8b00-0b480b860953";
const CONTENT_TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp" };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const opts = { workspace: process.env.MONKIES_WORKSPACE_ID || DEFAULT_WORKSPACE, json: false, files: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--workspace") opts.workspace = argv[++i];
    else if (argv[i] === "--json") opts.json = true;
    else opts.files.push(argv[i]);
  }
  return opts;
}

function cookieHeader() {
  const { cookies } = loadExtraSessions(root);
  if (!cookies.some((c) => c.name.endsWith("next-auth.session-token"))) {
    throw new Error(
      "No saved Monkies session. Log in once in the MCP browser and save it to .playwright-mcp/extra-sessions.json.",
    );
  }
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function uploadOne(file, { workspace, cookie }) {
  const contentType = CONTENT_TYPES[path.extname(file).toLowerCase()];
  if (!contentType) throw new Error(`${file}: unsupported type (use png/jpg/gif/webp)`);
  const bytes = fs.readFileSync(file);

  const signRes = await fetch(`${MONKIES}/api/go/asset/sign`, {
    method: "POST",
    // The API rejects any request without `Sec-Fetch-Site: same-origin` with 403 {"message":"Forbidden"}
    // (CSRF guard) — the cookie alone is not enough, even from Playwright's request context.
    headers: { "content-type": "application/json", cookie, origin: MONKIES, "sec-fetch-site": "same-origin" },
    body: JSON.stringify({ workspaceId: workspace, contentType }),
  });
  const signText = await signRes.text();
  if (signRes.status === 401 || /<html/i.test(signText)) {
    throw new Error(`sign ${signRes.status}: Monkies session expired — log in again and re-save extra-sessions.json`);
  }
  if (!signRes.ok) throw new Error(`sign ${signRes.status}: ${signText.slice(0, 200)}`);
  const { data } = JSON.parse(signText);
  if (bytes.length > data.maxBytes) throw new Error(`${file}: ${bytes.length} bytes exceeds ${data.maxBytes}`);

  const form = new FormData();
  for (const [k, v] of Object.entries(data.fields)) form.append(k, v);
  form.append("file", new Blob([bytes], { type: contentType }), path.basename(file));
  const upRes = await fetch(data.uploadUrl, { method: "POST", body: form });
  if (!upRes.ok) throw new Error(`upload ${upRes.status}: ${(await upRes.text()).slice(0, 200)}`);

  return { file: path.basename(file), url: `/api/go/asset/object?key=${encodeURIComponent(data.key)}` };
}

/**
 * next-auth uses a rolling session: GET /api/auth/session answers with a fresh
 * `session-token` cookie. Saving it back keeps the stored login alive past its
 * original 30-day expiry for as long as the script keeps being used.
 */
async function refreshSavedSession(cookie) {
  const res = await fetch(`${MONKIES}/api/auth/session`, { headers: { cookie } });
  const fresh = res.headers.getSetCookie().find((s) => s.includes("next-auth.session-token="));
  if (!res.ok || !fresh) return;
  const file = extraSessionsPath(root);
  const state = JSON.parse(fs.readFileSync(file, "utf8"));
  const [pair, ...attrs] = fresh.split(";");
  const value = pair.slice(pair.indexOf("=") + 1);
  const expires = attrs.map((a) => a.trim()).find((a) => /^expires=/i.test(a));
  for (const c of state.cookies ?? []) {
    if (c.name.endsWith("next-auth.session-token") && c.domain.replace(/^\./, "") === "monkies.monklabs.io") {
      c.value = value;
      if (expires) c.expires = Math.floor(new Date(expires.slice(8)).getTime() / 1000);
    }
  }
  fs.writeFileSync(file, JSON.stringify(state, null, 2), "utf8");
}

const opts = parseArgs(process.argv.slice(2));
if (!opts.files.length) {
  console.error("Usage: node scripts/monkies-upload.mjs [--workspace <id>] [--json] <file> [more files…]");
  process.exitCode = 1;
} else {
  try {
    const cookie = cookieHeader();
    const results = [];
    for (const file of opts.files) results.push(await uploadOne(file, { workspace: opts.workspace, cookie }));
    await refreshSavedSession(cookie).catch(() => {});
    if (opts.json) console.log(JSON.stringify(results, null, 2));
    else for (const r of results) console.log(`${r.file}\t${r.url}`);
  } catch (error) {
    console.error(`[monkies-upload] ${error.message}`);
    // exitCode, not exit(): exiting while undici sockets close trips a libuv assertion on Windows.
    process.exitCode = 1;
  }
}
