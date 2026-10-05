#!/usr/bin/env node
/**
 * Generate the refactor worklist for moving existing (legacy-tagged) tests onto the rebuilt
 * Automation Mapping. Output is local and git-ignored:
 *
 *   docs/automation-plans/refactor/README.md          overview + spec queue
 *   docs/automation-plans/refactor/NN-<spec>.md        per spec: rows → TC → steps → expected → reuse/new
 *
 *   node scripts/refactor-worklist.mjs
 *
 * Scope = mapping rows whose Notes `Legacy:` names a tag that still exists in tests/. A TC is
 * `reuse` when one of those legacy rows covered it (read from the mapping backup taken by
 * `npm run mapping:sync -- --rebuild --write`), otherwise `new`. Re-run after changing the mapping.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import "dotenv/config";

const SHEET_ID = process.env.YAPP_AUTOMATION_SHEET_ID;
const OUT = path.resolve("docs/automation-plans/refactor");
const WORK = path.resolve(".playwright-mcp/work");
const MAPPING = "Automation Mapping";
const posix = (p) => p.split(path.sep).join("/");

/** Where the refactored test() for a row lives: tests/<role>/<file>.spec.ts, E2E in tests/e2e/. */
const SPEC_FILE = {
  PROD: "products-list", PD: "digital-product", DM: "discord-membership", OC: "online-course", EVT: "events-and-tickets",
  PRF: "profile", ORD: "orders", EXP: "explore", PRM: "promotions", CART: "chart", TIP: "tip", LP: "landing",
  MEM: "membership", FE: "feeds", TGM: "telegram-membership", WLT: "wallet", ONB: "onboarding", CMP: "campaigns",
  SET: "settings", REF: "referral", ANL: "analytics",
};
function targetSpec(r) {
  const dom = r[0].split("-")[1];
  if (dom === "E2E") return `tests/e2e/${r[4].replace(/^E2E:\s*/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}.spec.ts`;
  const role = r[3] === "Buyer" ? "buyer" : "creator";
  if (dom === "CON") return role === "buyer" ? "tests/buyer/consultation.spec.ts" : "tests/creator/sessions.spec.ts";
  if (dom === "MB") return role === "buyer" ? "tests/buyer/message.spec.ts" : "tests/creator/messages.spec.ts";
  return `tests/${role}/${SPEC_FILE[dom] || dom.toLowerCase()}.spec.ts`;
}
const cell = (s) => String(s ?? "").replace(/\r/g, "").trim().replace(/\|/g, "\\|").replace(/\n+/g, "<br>") || "—";

async function token() {
  const sa = JSON.parse(fs.readFileSync(path.resolve(".google-sheets-service-account.json"), "utf8"));
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/spreadsheets.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const sig = crypto.sign("RSA-SHA256", Buffer.from(unsigned), sa.private_key).toString("base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }) });
  const j = await r.json();
  if (!j.access_token) throw new Error("Sheets auth failed");
  return j.access_token;
}

/** Legacy tag → { file, line, title } for every @AUT-* tag in tests/. */
function scanTests() {
  const tags = new Map();
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (p.endsWith(".spec.ts")) {
        const lines = fs.readFileSync(p, "utf8").split("\n");
        lines.forEach((l, i) => {
          for (const m of l.matchAll(/@(AUT-[A-Z0-9]+-[0-9]+)/g)) {
            // the test title is usually on one of the few lines above the tag block
            const title = lines.slice(Math.max(0, i - 6), i + 1).reverse().map((x) => /(?:test|authTest|creatorAuthTest|guestTest)\(\s*['"`]([^'"`]+)/.exec(x)?.[1]).find(Boolean) || "";
            if (!tags.has(m[1])) tags.set(m[1], { file: posix(path.relative("tests", p)), line: i + 1, title });
          }
        });
      }
    }
  };
  walk(path.resolve("tests"));
  return tags;
}

function latestBackup() {
  const files = fs.existsSync(WORK) ? fs.readdirSync(WORK).filter((f) => f.startsWith("automation-mapping-backup-")).sort() : [];
  if (!files.length) throw new Error("No mapping backup in .playwright-mcp/work — the old coverage is needed to tell reuse from new");
  // the first backup is the pre-rebuild mapping
  return JSON.parse(fs.readFileSync(path.join(WORK, files[0]), "utf8")).mapping;
}

async function main() {
  if (!SHEET_ID) throw new Error("YAPP_AUTOMATION_SHEET_ID is not set");
  const T = await token();
  const api = async (p) => {
    const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${p}`, { headers: { authorization: `Bearer ${T}` } });
    const j = await r.json();
    if (!r.ok) throw new Error(`Sheets ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
    return j;
  };
  const tabs = (await api("?fields=sheets.properties.title")).sheets.map((s) => s.properties.title).filter((t) => !/^(Automation|Bugs)/.test(t));
  const ranges = [`'${MAPPING}'!A2:P1000`, ...tabs.map((t) => `'${t.replace(/'/g, "''")}'!A1:J2000`)];
  const data = await api(`/values:batchGet?${ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&")}`);
  const mapping = (data.valueRanges[0].values || []).filter((r) => /^AUT-/.test(r[0] || ""));
  const tc = new Map();
  data.valueRanges.slice(1).forEach((v, i) => (v.values || []).forEach((r, ri) => {
    if (/^TC-/.test(r[0] || "")) tc.set(r[0].trim(), { tab: tabs[i], row: ri + 1, title: r[3], pre: r[4], steps: r[5], expected: r[6], result: r[7] });
  }));
  const oldCover = new Map(latestBackup().slice(1).filter((r) => /^AUT-/.test(r[0] || "")).map((r) => [r[0], new Set((r[6] || "").split(/[,\s]+/).filter((x) => /^TC-/.test(x)))]));
  const tags = scanTests();
  const legacyOf = (r) => ((r[14] || "").match(/Legacy: ([^;]+)/)?.[1] || "").split(/,\s*/).filter(Boolean);
  const knownBugOf = (r) => (r[14] || "").match(/Known bug: ([^;]+)/)?.[1] || "";

  // scope rows grouped by home spec
  const specs = new Map();
  for (const r of mapping) {
    const legacy = legacyOf(r).filter((l) => tags.has(l));
    if (!legacy.length) continue;
    const files = legacy.map((l) => tags.get(l).file);
    const home = Object.entries(files.reduce((m, f) => ((m[f] = (m[f] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1])[0][0];
    const ids = (r[6] || "").split(/[,\s]+/).filter(Boolean);
    const tcs = ids.map((id) => {
      const by = legacy.filter((l) => oldCover.get(l)?.has(id));
      return { id, ...(tc.get(id) || {}), reuse: by.map((l) => `${tags.get(l).file}:${tags.get(l).line} @${l}`) };
    });
    if (!specs.has(home)) specs.set(home, { rows: [], legacy: new Set() });
    const s = specs.get(home);
    legacy.forEach((l) => s.legacy.add(l));
    s.rows.push({ r, legacy, tcs });
  }
  const queue = [...specs.entries()].sort((a, b) => b[1].legacy.size - a[1].legacy.size || a[0].localeCompare(b[0]));

  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) if (f.endsWith(".md")) fs.rmSync(path.join(OUT, f));

  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const summary = [];
  queue.forEach(([spec, s], i) => {
    const nn = String(i + 1).padStart(2, "0");
    const file = `${nn}-${spec.replace(/\//g, "-").replace(/\.spec\.ts$/, "")}.md`;
    const totals = s.rows.reduce((a, x) => ({ tc: a.tc + x.tcs.length, reuse: a.reuse + x.tcs.filter((t) => t.reuse.length).length }), { tc: 0, reuse: 0 });
    const legacyList = [...s.legacy].sort().map((l) => `- \`@${l}\` — ${tags.get(l).file}:${tags.get(l).line}${tags.get(l).title ? ` · ${tags.get(l).title}` : ""}`);
    const body = [
      `# ${nn} · tests/${spec}`, "",
      `> Worklist refactor — di-generate ${today} oleh \`node scripts/refactor-worklist.mjs\`. Jangan edit tangan: ubah TC/mapping di sheet, \`npm run mapping:sync\`, lalu generate ulang. Rencana: [README](README.md).`, "",
      `**${s.rows.length} baris · ${totals.tc} TC (${totals.reuse} reuse, ${totals.tc - totals.reuse} new) · ${s.legacy.size} test legacy**`, "",
      "## Test legacy yang dipakai ulang lalu dihapus", "", ...legacyList, "",
      ...s.rows.flatMap(({ r, legacy, tcs }) => [
        `## ${r[0]} — ${cell(r[4])}`, "",
        `- **Layer / Role:** ${r[1]} · ${r[3]} · **Priority:** ${r[8]} · **Run Scope:** ${r[12]} · **Status:** ${r[13]}`,
        `- **Target spec:** \`${targetSpec(r)}\``,
        `- **Tag:** \`@${r[0]}\`${/^Smoke/.test(r[12]) ? " `@smoke`" : " `@regression`"} + tag fitur + \`@${r[3] === "Buyer" ? "buyer" : "creator"}\``,
        `- **Legacy:** ${legacy.map((l) => `\`@${l}\``).join(", ")}`,
        ...(knownBugOf(r) ? [`- **Known bug → \`test.fail()\`:** ${knownBugOf(r)}`] : []),
        `- **Precondition:** ${cell(r[9])}`, "",
        "| TC | Judul | Pre-condition | Steps | Expected | Hasil manual | Status |",
        "|---|---|---|---|---|---|---|",
        ...tcs.map((t) => `| ${t.id} | ${cell(t.title)} | ${cell(t.pre)} | ${cell(t.steps)} | ${cell(t.expected)} | ${cell(t.result)} | ${t.reuse.length ? `reuse: ${t.reuse.join("<br>")}` : "**new**"} |`),
        "",
      ]),
    ];
    fs.writeFileSync(path.join(OUT, file), body.join("\n"), "utf8");
    summary.push({ nn, spec, file, rows: s.rows.length, ids: s.rows.map((x) => x.r[0]), ...totals, legacy: s.legacy.size, smoke: s.rows.filter((x) => /^Smoke/.test(x.r[12])).length, bugs: s.rows.filter((x) => knownBugOf(x.r)).length });
  });
  fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 1));
  const totalRows = summary.reduce((a, x) => a + x.rows, 0);
  const totalTc = summary.reduce((a, x) => a + x.tc, 0);
  const totalReuse = summary.reduce((a, x) => a + x.reuse, 0);
  const allLegacy = new Set([...specs.values()].flatMap((s) => [...s.legacy]));
  fs.writeFileSync(path.join(OUT, "README.md"), readme({ today, summary, totalRows, totalTc, totalReuse, legacyCount: allLegacy.size, mappingRows: mapping.length }), "utf8");
  console.log(`${summary.length} spec · ${totalRows} rows · ${totalTc} TC (${totalReuse} reuse, ${totalTc - totalReuse} new) → ${posix(path.relative(process.cwd(), OUT))}`);
}

function readme({ today, summary, totalRows, totalTc, totalReuse, legacyCount, mappingRows }) {
  return [
    "# Refactor automation ke Automation Mapping baru", "",
    `> Di-generate ${today} oleh \`node scripts/refactor-worklist.mjs\` (lokal, gitignored). Setelah TC/mapping di sheet`,
    "> disesuaikan: `npm run mapping:sync` (cek laporan, `-- --write`), lalu jalankan generator ini lagi.", "",
    "## Konteks", "",
    `Automation Mapping dibangun ulang 4 Okt 2026 (${mappingRows} baris, ID \`AUT-<DOM>-NNN\` dan \`AUT-E2E-001..015\`),`,
    "sedangkan suite masih memakai tag legacy (`@AUT-FV-*`, `@AUT-E2E-0NN`) dan banyak UI berubah.", "",
    "## Keputusan", "",
    `- **Scope = test yang sudah ada.** Hanya baris mapping yang Notes \`Legacy:\`-nya menyebut tag yang masih ada di \`tests/\` — **${totalRows} baris** dari ${legacyCount} test legacy. Baris lain (belum pernah diautomasi) tidak disentuh sekarang.`,
    `- **Baris dilengkapi:** ${totalTc} TC — **${totalReuse} reuse** (step dipindah dari test legacy) dan **${totalTc - totalReuse} new** (step ditambahkan).`,
    "- **Urutan per spec file**, mulai dari spec dengan test legacy terbanyak.",
    "- Hasil akhir: semua baris scope `Automated`, nol tag legacy di `tests/`, satu `test()` per baris.", "",
    "## Antrian spec", "",
    "Spec = file yang memegang mayoritas test legacy baris tersebut; test barunya ditulis di **Target spec** tiap baris (lihat worklist).", "",
    "| # | Spec legacy | Worklist | Baris | TC | Reuse | New | Test legacy | Smoke | Known bug |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...summary.map((x) => `| ${x.nn} | tests/${x.spec} | [${x.file}](${x.file}) | ${x.rows} | ${x.tc} | ${x.reuse} | ${x.tc - x.reuse} | ${x.legacy} | ${x.smoke} | ${x.bugs} |`),
    `| | **Total** | | **${totalRows}** | **${totalTc}** | **${totalReuse}** | **${totalTc - totalReuse}** | | | |`, "",
    "Tidak disentuh: `creator/streaming`, `creator/streamer-overlays` (Livestream manual-only), `creator/affiliate` (tanpa tab TC), dan smoke untagged `creator/{analytics,campaigns,feeds,membership,messages,referral,settings,wallet}`.", "",
    "## Langkah 0 — tooling (sekali, sebelum spec #01)", "",
    "1. Worklist ini (`scripts/refactor-worklist.mjs`) — selesai.",
    "2. `npm run mapping:sync -- --set-status <AUT-ID> Automated` — set status 1 baris via service account; `add-test-spec` Step 9 dan AGENTS.md Fast Path step 8 memakai perintah ini.",
    "3. `npm run audit:tags -- --mapping` — per spec: tag legacy tersisa, baris scope tanpa test, test bertag ID yang belum `Automated` (pelacak progres).", "",
    "## Langkah per spec", "",
    "Mengikuti skill `add-test-spec` dan `.agents/rules/testing.md` → *Automation strategy*.", "",
    "1. Buka worklist spec itu; jalankan test legacy-nya sekali untuk melihat mana yang rusak karena UI.",
    "2. Untuk tiap baris (urut ID):",
    "   - **satu `test()`** di *Target spec*: judul = Scenario; tag `@AUT-…` + tag fitur + role + `@smoke` (Run Scope `Smoke…`) atau `@regression`;",
    "   - **pindahkan step** dari test legacy (`reuse`) dan **tambah step** untuk TC `new`; satu `test.step()` per TC, judul deskriptif tanpa ID TC, ≥1 interaksi + ≥1 assertion per TC;",
    "   - UI berubah → verifikasi locator lewat `generate-locators-mcp`; locator baru/tersentuh pakai `smartLocator` di page object;",
    "   - data via API seeding (`src/helpers/api/*`) + cleanup;",
    "   - `Known bug` → step sesuai expected yang benar, test `test.fail()` + annotation `issue: <ticket>`;",
    "   - E2E ditulis di `tests/e2e/`.",
    "3. **Hapus test legacy** setelah semua TC-nya pindah — tidak boleh ada test ganda.",
    "4. `npx tsc --noEmit` → `npx eslint .` → `npx playwright test <target spec> --project=chromium --grep @<AUT-ID>` sekali → lulus → `npm run mapping:sync -- --set-status <AUT-ID> Automated`.",
    "5. Tulis balik fakta produk baru ke `.agents/knowledge/`.",
    "6. Satu commit per spec: `refactor(tests): move <spec> onto Automation Mapping <DOM> rows`.", "",
    "## Verifikasi", "",
    "- Per baris: lulus sekali di isolasi → status `Automated` → `npm run mapping:sync` dry-run 0 perubahan.",
    "- Per spec: `npm run audit:tags -- --mapping` = 0 tag legacy untuk spec itu; `npx tsc --noEmit`, `npx eslint .`, `npm run audit:aut-order` bersih; `npm run audit:locators` tidak bertambah; spec penuh dijalankan sekali.",
    "- Akhir: semua baris scope `Automated`, `@AUT-FV-` tidak ada lagi di `tests/`, `npm run test:smoke` lulus.", "",
  ].join("\n");
}

main().catch((e) => {
  console.error("[refactor-worklist]", e.message);
  process.exitCode = 1;
});
