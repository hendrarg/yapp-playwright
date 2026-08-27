/**
 * Close leftover MCP Playwright browsers and this repo's MCP servers.
 *
 * `browser_close` only closes the *page* ("Close the page" in the tool schema),
 * so the browser process the MCP server launched stays alive showing a blank
 * window, and another is added every time a server is restarted. Left alone
 * they accumulate for a whole working day (10 stray Chromium processes owned by
 * 8 MCP servers before the first cleanup).
 *
 * Deliberately conservative — it only ever touches:
 *   - browsers whose executable lives under the Playwright browser cache, and
 *   - node processes running this repo's `@playwright/mcp` server.
 * A normal Chrome install, a browser owned by a running `playwright test`, and
 * MCP servers started by another tool (Cursor, `npx @playwright/mcp@latest`)
 * are left alone unless you opt in.
 *
 * Usage:
 *   node scripts/mcp-clean.mjs                  # browsers + this repo's MCP servers
 *   node scripts/mcp-clean.mjs --dry-run        # list what would be closed
 *   node scripts/mcp-clean.mjs --browsers       # browsers only, keep servers running
 *   node scripts/mcp-clean.mjs --all-servers    # also close other tools' MCP servers
 */
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolvePlaywrightBrowsersPath } from "../config/playwright-browsers-path.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const browsersOnly = args.includes("--browsers");
const allServers = args.includes("--all-servers");

const browsersRoot = resolvePlaywrightBrowsersPath();
const BROWSER_NAMES = new Set([
  "chrome.exe",
  "msedge.exe",
  "firefox.exe",
  "headless_shell.exe",
  "chrome",
  "firefox",
  "headless_shell",
]);

const norm = (value) => String(value ?? "").split(path.win32.sep).join("/").toLowerCase();

const MCP_SERVER = /@playwright[\\/]mcp[\\/]cli\.js|playwright-mcp/i;
const TEST_RUNNER = /playwright[\\/]cli\.js|@playwright[\\/]test|playwright(\.cmd)?\s+test/i;
/** Another tool's copy: Cursor's helper node, or an npx-cached `@playwright/mcp@latest`. */
const FOREIGN = /[\\/]\.?cursor[\\/]|_npx|@playwright\/mcp@/i;
/** The repo wrapper started with a relative path, i.e. launched with cwd = repo root. */
const OWN_WRAPPER = /(^|\s)"?(?:node|node\.exe)"?\s+"?scripts[\\/]playwright-mcp\.mjs/i;

function snapshot() {
  if (process.platform !== "win32") {
    const raw = execFileSync("ps", ["-eo", "pid=,ppid=,comm=,args="], {
      encoding: "utf8",
      maxBuffer: 32 << 20,
    });
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const m = line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s*(.*)$/);
        return m && { pid: Number(m[1]), ppid: Number(m[2]), name: path.basename(m[3]), exe: m[3], cmd: m[4] };
      })
      .filter(Boolean);
  }

  const ps = [
    "Get-CimInstance Win32_Process",
    "Select-Object ProcessId,ParentProcessId,Name,ExecutablePath,CommandLine",
    "ConvertTo-Json -Depth 2 -Compress",
  ].join(" | ");
  const raw = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], {
    encoding: "utf8",
    maxBuffer: 64 << 20,
  });
  const rows = JSON.parse(raw);
  return (Array.isArray(rows) ? rows : [rows]).map((r) => ({
    pid: r.ProcessId,
    ppid: r.ParentProcessId,
    name: r.Name ?? "",
    exe: r.ExecutablePath ?? "",
    cmd: r.CommandLine ?? "",
  }));
}

const procs = snapshot();
const byPid = new Map(procs.map((p) => [p.pid, p]));

const servers = procs.filter((p) => MCP_SERVER.test(p.cmd));
const ownServers = servers.filter(
  (p) =>
    !FOREIGN.test(`${p.exe} ${p.cmd}`) &&
    (norm(p.cmd).includes(norm(root)) || OWN_WRAPPER.test(p.cmd)),
);
const ownServerPids = new Set(ownServers.map((p) => p.pid));
const serverPids = new Set(servers.map((p) => p.pid));

/** Walk up the parent chain and report the first process we recognise. */
function ancestry(proc) {
  const seen = new Set();
  let cur = byPid.get(proc.ppid);
  while (cur && !seen.has(cur.pid)) {
    seen.add(cur.pid);
    if (TEST_RUNNER.test(cur.cmd) && !MCP_SERVER.test(cur.cmd)) return { kind: "test-run", owner: cur };
    if (ownServerPids.has(cur.pid)) return { kind: "own-mcp", owner: cur };
    if (serverPids.has(cur.pid)) return { kind: "foreign-mcp", owner: cur };
    cur = byPid.get(cur.ppid);
  }
  return { kind: "orphan", owner: null };
}

const browsers = procs.filter(
  (p) => BROWSER_NAMES.has(p.name.toLowerCase()) && norm(p.exe).startsWith(norm(browsersRoot)),
);
const windows = browsers.filter((p) => !browsers.some((q) => q.pid === p.ppid));

const close = [];
const keep = [];
for (const win of windows) {
  const { kind } = ancestry(win);
  const targeted = kind === "own-mcp" || kind === "orphan" || (kind === "foreign-mcp" && allServers);
  const entry = { proc: win, kind, tree: [win, ...browsers.filter((q) => q.ppid === win.pid)] };
  (targeted ? close : keep).push(entry);
}

const serverClose = browsersOnly ? [] : allServers ? servers : ownServers;

const label = (p) => `${p.name || "node"}(${p.pid})`;
const REASON = {
  "own-mcp": "MCP repo ini",
  orphan: "yatim, servernya sudah mati",
  "foreign-mcp": "MCP tool lain",
  "test-run": "sedang dipakai playwright test",
};

console.log(`browser cache : ${browsersRoot}`);
console.log(
  `ditemukan     : ${browsers.length} proses browser Playwright (${windows.length} jendela), ` +
    `${servers.length} server MCP (${ownServers.length} milik repo ini)\n`,
);

for (const e of keep) console.log(`  SKIP  ${label(e.proc)} +${e.tree.length - 1} anak — ${REASON[e.kind]}`);
for (const e of close) console.log(`  TUTUP ${label(e.proc)} +${e.tree.length - 1} anak — ${REASON[e.kind]}`);
for (const s of serverClose) {
  console.log(`  TUTUP ${label(s)} — server MCP${ownServerPids.has(s.pid) ? " (repo ini)" : " (tool lain)"}`);
}

const victims = [...close.flatMap((e) => [...e.tree.slice(1), e.proc]), ...serverClose];
if (!victims.length) {
  console.log("\nbersih — tidak ada yang perlu ditutup.");
  process.exit(0);
}
if (dryRun) {
  console.log(`\n--dry-run: ${victims.length} proses akan ditutup.`);
  process.exit(0);
}

let closed = 0;
for (const victim of victims) {
  try {
    process.kill(victim.pid, "SIGKILL");
    closed += 1;
  } catch (error) {
    if (error.code !== "ESRCH") console.error(`  gagal menutup ${label(victim)}: ${error.message}`);
  }
}
console.log(`\nditutup ${closed}/${victims.length} proses.`);
