#!/usr/bin/env node
/**
 * Ingest the "Yapp - Test Case" sheet into the Obsidian vault, eproc-style: one note per
 * feature (= sheet tab) at projects/yapp/tc-<feature>.md, holding every TC of that feature as a
 * `### <TC-ID> · <Title>` block, plus links to the feature's GitBook pages, a PRD slot and the
 * matching .agents/knowledge note.
 *
 *   npm run tc:ingest            write / refresh the vault
 *   npm run tc:ingest -- --check report what would change, write nothing
 *
 * Only the TC content travels (ID, Epic, Feature, Title, Preconditions, Steps, Expected).
 * Per-run state — Test Result, Evidence, notes — stays in the sheet; each note carries an
 * aggregate of Test Result and the list of Failed TCs. A note is rewritten only when its content
 * changed; generated notes whose tab left the sheet, and the retired per-TC layout under
 * projects/yapp/testcases/, are removed.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import "dotenv/config";

const CHECK = process.argv.includes("--check");
const SHEET_ID = process.env.YAPP_AUTOMATION_SHEET_ID;
const VAULT = process.env.YAPP_OBSIDIAN_VAULT || "D:/Knowledge";
const SA_PATH = path.resolve(".google-sheets-service-account.json");
const PROJECT_REL = "projects/yapp";
const PROJECT = path.join(VAULT, PROJECT_REL);
const RETIRED_DIR = path.join(PROJECT, "testcases");
const GITBOOK_RAW = "raw/sources/yapp-docs-gitbook";
const GITBOOK_URL = "https://yapp.gitbook.io/yapp-docs";
const MARK = "tc-ingest";
const TODAY = new Date().toISOString().slice(0, 10);

/** Tab → GitBook pages (paths under raw/sources/yapp-docs-gitbook, no .md) and knowledge note. */
const FEATURES = {
  "Products": { gitbook: ["features/product-detail-page"], knowledge: "products" },
  "Product Digital": { gitbook: ["digital-product", "product-guides/list-digital-product-on-yapp"], knowledge: "products" },
  "Discord Membership": { gitbook: ["discord-membership", "third-party-configuration/connect-to-discord"], knowledge: "membership-products" },
  "Consultation": { gitbook: ["consultation", "third-party-configuration/connect-to-google-calendar"], knowledge: "products" },
  "Event & Tickets": { gitbook: ["event-and-tickets"], knowledge: "products" },
  "Online Course": { gitbook: ["online-course"], knowledge: "products" },
  "Telegram Membership": { gitbook: ["telegram-membership"], knowledge: "membership-products" },
  "Profile": { gitbook: ["features/creator-profile", "product-guides/making-a-yapp-page"], knowledge: "explore-and-profile" },
  "Orders": { gitbook: ["creator/payments"], knowledge: "orders-and-reports" },
  "Explore": { gitbook: ["buyer/buyer-explore-page"], knowledge: "explore-and-profile" },
  "Promotion": { gitbook: ["features/promotion", "product-guides/how-to-create-a-promo-code"], knowledge: "purchase-and-payment" },
  "Messages & Broadcast": { gitbook: ["features/dm-and-broadcast"], knowledge: "messaging" },
  "Add to Cart": { gitbook: ["buyer/add-to-cart", "buyer/checkout-page"], knowledge: "purchase-and-payment" },
  "Tipping": { gitbook: ["features/tipping"], knowledge: "tipping" },
  "Wallet": { gitbook: ["creator/wallet"], knowledge: "wallet" },
  "Landing Page": { gitbook: ["welcome-to-yapp", "features/yapp-for-fans"], knowledge: null },
  "Livestream": { gitbook: ["creator/stream-studio", "third-party-configuration/connect-to-obs"], knowledge: "livestream" },
  "Analytics": { gitbook: ["creator/statistics", "creator/payments"], knowledge: "orders-and-reports" },
  "Referral": { gitbook: ["creator/referral"], knowledge: "referral" },
  "Membership": { gitbook: ["features/membership"], knowledge: "membership-tiers" },
  "Feeds and Exclusive": { gitbook: ["features/feeds", "features/exclusive-post"], knowledge: "posts" },
  "Campaigns": { gitbook: ["features/campaigns"], knowledge: "campaigns" },
  "Settings": { gitbook: ["creator/settings"], knowledge: "settings" },
  "Onboarding": { gitbook: ["creator/creator-onboarding", "features/sign-in-and-authentication"], knowledge: "onboarding" },
};

const slugify = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const yaml = (v) => JSON.stringify(v ?? "");
/** Cell text must not create links, headings or callouts by accident. */
const safe = (s) => String(s ?? "").replace(/\r/g, "").replace(/\[\[/g, "\\[\\[").replace(/\]\]/g, "\\]\\]").trim();
const inline = (s) => safe(s).replace(/\s*\n\s*/g, " ").replace(/\|/g, "\\|");
const steps = (s) => {
  const lines = safe(s).split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return "_—_";
  return lines.map((l, i) => (/^\d+[.)]\s/.test(l) ? l : `${i + 1}. ${l}`).replace(/^([#>])/, "\\$1")).join("\n");
};
const para = (s) => safe(s).replace(/^([#>])/gm, "\\$1") || "_—_";

async function sheetsToken() {
  const sa = JSON.parse(fs.readFileSync(SA_PATH, "utf8"));
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/spreadsheets.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const sig = crypto.sign("RSA-SHA256", Buffer.from(unsigned), sa.private_key).toString("base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }) });
  const j = await r.json();
  if (!j.access_token) throw new Error("Sheets auth failed: " + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}

async function sheetsGet(token, p) {
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${p}`, { headers: { authorization: `Bearer ${token}` } });
  const j = await r.json();
  if (!r.ok) throw new Error(`Sheets ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}

const stats = { written: 0, unchanged: 0, removed: 0 };
const isGenerated = (file) => new RegExp(`^generated: ${MARK}$`, "m").test(fs.readFileSync(file, "utf8"));

/** Writes `body(created, updated)` unless only the `updated` stamp would differ. */
function emit(file, body) {
  const prev = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  const created = (prev && /^created: (\S+)$/m.exec(prev)?.[1]) || TODAY;
  const next = body(created, TODAY);
  const strip = (t) => t.replace(/^updated: .*$/m, "");
  if (prev && strip(prev) === strip(next)) return void stats.unchanged++;
  stats.written++;
  if (!CHECK) fs.writeFileSync(file, next, "utf8");
}

function remove(file) {
  stats.removed++;
  if (!CHECK) fs.rmSync(file);
}

const gitbookTitle = (rel) => /^# (.+)$/m.exec(fs.readFileSync(path.join(VAULT, GITBOOK_RAW, rel + ".md"), "utf8"))?.[1].trim() || rel;

function renderNote(tab, f, slug, tcs, source) {
  const gb = f.gitbook.map((g) => ({ rel: g, title: gitbookTitle(g) }));
  const roles = { creator: tcs.filter((t) => t.role === "creator").length, buyer: tcs.filter((t) => t.role === "buyer").length };
  const results = tcs.reduce((m, t) => ((m[t.result] = (m[t.result] || 0) + 1), m), {});
  const failed = tcs.filter((t) => t.result === "Failed");
  const epics = [...new Set(tcs.map((t) => t.epic))];
  const prefix = [...new Set(tcs.map((t) => t.id.replace(/-\d+$/, "-*")))].join(", ");
  const knowledge = f.knowledge ? `[[projects/yapp/knowledge/${f.knowledge}|${f.knowledge}]]` : "— (belum ada note knowledge)";
  const gitbookLinks = gb.map((g) => `[[${GITBOOK_RAW}/${g.rel}.md|${g.title}]] ([web](${GITBOOK_URL}/${g.rel}))`).join(" · ");

  const failedTable = failed.length
    ? `### ${failed.length} TC berstatus Failed\n\n| TC | Epic · Feature | Judul |\n|---|---|---|\n` +
      failed.map((t) => `| \`${t.id}\` | ${inline(t.epic)} · ${inline(t.feature)} | ${inline(t.title)} |`).join("\n")
    : "### TC berstatus Failed\n\nTidak ada.";

  const blocks = epics.map((e) => {
    const inEpic = tcs.filter((t) => t.epic === e);
    return `## ${safe(e) || "(tanpa Epic)"} (${inEpic.length} TC)\n\n` + inEpic.map((t) => `### ${t.id} · ${inline(t.title)}

**Feature.** ${inline(t.feature) || "—"} · **Role.** ${t.role}

**Pre-condition.** ${para(t.pre)}

**Steps.**

${steps(t.steps)}

**Expected.** ${para(t.expected)}`).join("\n\n");
  }).join("\n\n");

  return (created, updated) => `---
title: ${yaml(`${tab} - Tc`)}
type: note
kind: tc
feature: ${slug}
module: ${yaml(tab)}
tags: [yapp, testcase, tc, ${slug}]
prd: ""
gitbook: [${gb.map((g) => yaml(`${GITBOOK_URL}/${g.rel}`)).join(", ")}]
gitbook_raw: [${gb.map((g) => yaml(`${GITBOOK_RAW}/${g.rel}.md`)).join(", ")}]
knowledge: ${yaml(f.knowledge ? `projects/yapp/knowledge/${f.knowledge}` : "")}
source: ${yaml(source)}
generated: ${MARK}
created: ${created}
updated: ${updated}
sources: ${1 + gb.length}
status: active
---

# ${tab} - Tc

> [[${PROJECT_REL}/testcase-index|TestCase index]] · [[${PROJECT_REL}/knowledge/index|Knowledge index]] · GitBook: ${gitbookLinks} · PRD: belum ada · Knowledge: ${knowledge}

Seluruh **${tcs.length} TC** tab \`${tab}\` dari sheet *Yapp - Test Case*, dikelompokkan per Epic.
**Kolom yang dibawa:** TC ID · Epic · Feature · Title · Preconditions · Steps · Expected.
**Yang tidak dibawa** karena state per-run: Test Result, Evidence Web, notes Web — agregatnya di bawah,
statusnya per TC dibaca langsung dari sheet. Note ini di-generate (\`npm run tc:ingest\` di repo yapp) —
jangan diedit tangan; ubah sheet-nya lalu regenerate.

> [!todo] PRD
> PRD fitur ini belum ada di vault. Setelah di-ingest ke \`raw/sources/yapp-prd/\`, isi field \`prd\`
> di frontmatter; note PRD-nya menautkan balik ke note ini.

## Ringkasan

- **${tcs.length} TC** · ID \`${prefix}\` · creator ${roles.creator} · buyer ${roles.buyer} · ${epics.length} Epic
- **Agregat Test Result** (per tanggal \`updated\`): ${Object.entries(results).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · ")}

${failedTable}

${blocks}
`;
}

async function main() {
  if (!SHEET_ID) throw new Error("YAPP_AUTOMATION_SHEET_ID is not set");
  if (!fs.existsSync(PROJECT)) throw new Error(`Vault project not found: ${PROJECT} (set YAPP_OBSIDIAN_VAULT)`);
  for (const [tab, f] of Object.entries(FEATURES)) {
    for (const g of f.gitbook) if (!fs.existsSync(path.join(VAULT, GITBOOK_RAW, g + ".md"))) throw new Error(`${tab}: GitBook raw missing ${g}.md`);
    if (f.knowledge && !fs.existsSync(path.join(PROJECT, "knowledge", f.knowledge + ".md"))) throw new Error(`${tab}: knowledge note missing ${f.knowledge}.md`);
  }

  const token = await sheetsToken();
  const meta = await sheetsGet(token, "?fields=sheets.properties(title,sheetId)");
  const tabs = meta.sheets.map((s) => s.properties).filter((p) => !/^(Automation|Bugs)/.test(p.title));
  const unmapped = tabs.filter((t) => !FEATURES[t.title]).map((t) => t.title);
  if (unmapped.length) throw new Error("Tabs without a FEATURES entry: " + unmapped.join(", "));
  const data = await sheetsGet(token, `/values:batchGet?${tabs.map((t) => `ranges=${encodeURIComponent(`'${t.title}'!A1:J2000`)}`).join("&")}`);

  const seen = new Map();
  const planned = new Set();
  const summary = [];
  data.valueRanges.forEach((vr, i) => {
    const tab = tabs[i];
    const slug = slugify(tab.title);
    const tcs = [];
    for (const r of (vr.values || []).slice(1)) {
      const id = (r[0] || "").trim();
      if (!/^TC-/.test(id)) continue;
      if (seen.has(id)) { console.warn(`duplicate TC ID ${id} in '${tab.title}' (first in '${seen.get(id)}') — skipped`); continue; }
      seen.set(id, tab.title);
      tcs.push({
        id, epic: (r[1] || "").trim(), feature: (r[2] || "").trim(), title: (r[3] || "").trim(), pre: r[4], steps: r[5], expected: r[6],
        result: (r[7] || "").trim() || "(kosong)", role: /-C-/.test(id) ? "creator" : /-B-/.test(id) ? "buyer" : "other",
      });
    }
    const file = path.join(PROJECT, `tc-${slug}.md`);
    planned.add(path.resolve(file));
    emit(file, renderNote(tab.title, FEATURES[tab.title], slug, tcs, `Yapp - Test Case (Google Sheet ${SHEET_ID}), tab '${tab.title}' (gid ${tab.sheetId})`));
    summary.push({ tab: tab.title, slug, n: tcs.length, failed: tcs.filter((t) => t.result === "Failed").length });
  });

  // Generated tc-*.md whose tab is gone.
  for (const f of fs.readdirSync(PROJECT)) {
    const full = path.resolve(PROJECT, f);
    if (/^tc-.*\.md$/.test(f) && !planned.has(full) && isGenerated(full)) remove(full);
  }
  // Retired per-TC layout (projects/yapp/testcases/<feature>/<TC-ID>.md): generated files only.
  if (fs.existsSync(RETIRED_DIR)) {
    for (const d of fs.readdirSync(RETIRED_DIR)) {
      const dir = path.join(RETIRED_DIR, d);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const f of fs.readdirSync(dir)) if (f.endsWith(".md") && isGenerated(path.join(dir, f))) remove(path.join(dir, f));
      if (!CHECK && !fs.readdirSync(dir).length) fs.rmdirSync(dir);
    }
    if (!CHECK && !fs.readdirSync(RETIRED_DIR).length) fs.rmdirSync(RETIRED_DIR);
  }

  console.log(JSON.stringify(summary));
  console.log(`${CHECK ? "[check] " : ""}features ${summary.length} · TC ${seen.size} · written ${stats.written} · unchanged ${stats.unchanged} · removed ${stats.removed}`);
}

main().catch((e) => {
  console.error("[tc-ingest]", e.message);
  process.exitCode = 1;
});
