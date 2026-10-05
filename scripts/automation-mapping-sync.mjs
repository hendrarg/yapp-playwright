#!/usr/bin/env node
/**
 * Keep the "Automation Mapping" sheet in step with the manual test-case sheets.
 *
 *   npm run mapping:sync                       dry-run lifecycle sync (report only)
 *   npm run mapping:sync -- --write            apply the sync
 *   npm run mapping:sync -- --rebuild          dry-run a full rebuild with the current strategy
 *   npm run mapping:sync -- --rebuild --write  replace the whole mapping (backup first)
 *
 * Strategy (see .agents/rules/testing.md → Automation strategy):
 * - Functional rows `AUT-<DOM>-NNN`: one cohesive feature slice per row, grouped
 *   Tab → Role → Epic → Feature, 3–8 TCs, positive and negative/boundary apart.
 * - E2E rows `AUT-E2E-NNN`: hand-picked cross-role journeys.
 * - Smoke is a Run Scope (`Smoke + Regression`) on 1 row per domain × role, not a layer.
 * - Excluded features (scripts/automation-mapping.config.json → exclude) are never mapped.
 * - Lifecycle: renamed TCs (same content hash, new ID) are renamed in place; deleted TCs leave
 *   their row (empty Planned rows go, empty Automated rows become Retired); new TCs join a
 *   Planned row of the same feature or start a new row; changed TC content flips an Automated
 *   row to Needs Review; open bugs on a covered TC are listed as `Known bug:` in Notes.
 *
 * Writes a report to .playwright-mcp/work/mapping-sync-report.md on every run and keeps the
 * per-TC content hashes in .playwright-mcp/work/mapping-tc-state.json (used to detect renames).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import "dotenv/config";

const WRITE = process.argv.includes("--write");
const REBUILD = process.argv.includes("--rebuild");
const SHEET_ID = process.env.YAPP_AUTOMATION_SHEET_ID;
const SA_PATH = path.resolve(".google-sheets-service-account.json");
const WORK = path.resolve(".playwright-mcp/work");
const REPORT = path.join(WORK, "mapping-sync-report.md");
const STATE = path.join(WORK, "mapping-tc-state.json");
const CONFIG = JSON.parse(fs.readFileSync(path.resolve("scripts/automation-mapping.config.json"), "utf8"));
const MAPPING = "Automation Mapping";
const CLARIFICATIONS = process.env.YAPP_AUTOMATION_CLARIFICATIONS_SHEET || "Automation Clarifications";
const TODAY = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10); // local date
const COLS = 16; // A..P
const FP_HEADER = "TC Fingerprint";
const CLOSED_BUG = /^(Selesai|Ditarik|Duplikat|Done|Closed|Fixed)/i;
const PRIORITY_RANK = { P0: 0, P1: 1, P2: 2 };

const hash = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 12);
const norm = (s) => String(s ?? "").replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
const re = (p) => new RegExp(p, "i");

// ---------------------------------------------------------------- Sheets API
async function token() {
  const sa = JSON.parse(fs.readFileSync(SA_PATH, "utf8"));
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const sig = crypto.sign("RSA-SHA256", Buffer.from(unsigned), sa.private_key).toString("base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }) });
  const j = await r.json();
  if (!j.access_token) throw new Error("Sheets auth failed: " + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}

let T;
async function api(p, opts = {}) {
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${p}`, { ...opts, headers: { authorization: `Bearer ${T}`, "content-type": "application/json" } });
  const j = await r.json();
  if (!r.ok) throw new Error(`Sheets ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  return j;
}
const range = (tab, a1) => `'${tab.replace(/'/g, "''")}'!${a1}`;

// ---------------------------------------------------------------- load
async function load() {
  const meta = await api("?fields=sheets.properties(title,sheetId)");
  const titles = meta.sheets.map((s) => s.properties.title);
  const tcTabs = titles.filter((t) => !/^(Automation|Bugs)/.test(t));
  const unknown = tcTabs.filter((t) => !CONFIG.domains[t] && !CONFIG.exclude.tabs[t]);
  if (unknown.length) throw new Error(`Tabs missing from config.domains / exclude.tabs: ${unknown.join(", ")}`);
  const ranges = [...tcTabs.map((t) => range(t, "A1:J2000")), range(MAPPING, "A1:P1000"), range("Bugs", "A1:L1000"), range(CLARIFICATIONS, "A1:I1000")];
  const data = await api(`/values:batchGet?${ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&")}`);
  const v = data.valueRanges.map((x) => x.values || []);

  const tcs = [];
  tcTabs.forEach((tab, ti) => {
    v[ti].forEach((r, ri) => {
      const id = norm(r[0]);
      if (!/^TC-/.test(id) || /-GAP-/.test(id)) return;
      tcs.push({
        id, tab, row: ri + 1, epic: norm(r[1]), feature: norm(r[2]), title: norm(r[3]), steps: norm(r[5]), expected: norm(r[6]),
        result: norm(r[7]), notes: norm(r[9]),
        role: /-C-/.test(id) ? "Creator" : /-B-/.test(id) ? "Buyer" : "Creator",
        hash: hash([norm(r[3]), norm(r[5]), norm(r[6])].join("\u0001")),
      });
    });
  });
  const off = tcTabs.length;
  return { tcTabs, tcs, mapping: v[off], bugs: v[off + 1], clar: v[off + 2] };
}

// ---------------------------------------------------------------- classification
function exclusionOf(tc) {
  if (CONFIG.exclude.tabs[tc.tab]) return CONFIG.exclude.tabs[tc.tab];
  for (const rule of CONFIG.exclude.rules) {
    if (rule.tabs !== "*" && !rule.tabs.includes(tc.tab)) continue;
    if (re(rule.pattern).test(`${tc.feature} | ${tc.title}`)) return rule.reason;
  }
  return null;
}
const isNegative = (tc) => re(CONFIG.negativePattern).test(`${tc.title} | ${tc.feature}`);

function priorityOf(tcs) {
  const text = tcs.map((t) => t.feature).join(" | ");
  const tab = tcs[0].tab;
  if (CONFIG.priority.p2Tabs.includes(tab)) return "P2";
  if (CONFIG.priority.p0Tabs.includes(tab) || re(CONFIG.priority.p0Pattern).test(text)) return "P0";
  if (re(CONFIG.priority.p2Pattern).test(tcs.map((t) => t.feature).join(" | "))) return "P2";
  return "P1";
}

function openBugs(bugRows) {
  const byTc = new Map();
  for (const r of bugRows.slice(1)) {
    const [bugId, , , , , , , , related, status, ticket] = r.map(norm);
    if (!bugId || CLOSED_BUG.test(status)) continue;
    for (const id of (related || "").split(/[,\s]+/).filter((x) => /^TC-/.test(x))) {
      if (!byTc.has(id)) byTc.set(id, []);
      byTc.get(id).push(ticket ? `${bugId} (${ticket})` : bugId);
    }
  }
  return byTc;
}

// ---------------------------------------------------------------- old mapping
function parseMapping(values) {
  const header = values[0] || [];
  const rows = values.slice(1).filter((r) => /^AUT-/.test(norm(r[0]))).map((r) => {
    const cells = Array.from({ length: COLS }, (_, i) => norm(r[i]));
    return { id: cells[0], cells, tcIds: cells[6].split(/[,\s]+/).filter((x) => /^TC-/.test(x)) };
  });
  return { header, rows };
}

function majority(values, fallback) {
  const c = values.filter(Boolean).reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {});
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || fallback;
}

// ---------------------------------------------------------------- row builders
const ROLE_PRE = {
  Creator: "Creator test account (token1, hendrarg) is available; feature-state fixtures are seeded via API before the run",
  Buyer: "Buyer test account is available; the creator's products/content/state the flow needs are seeded via API before the run",
};

function notesFor({ tcs, bugsByTc, legacy, extra = [] }) {
  const parts = [`Features: ${[...new Set(tcs.map((t) => t.feature))].join(", ")}`];
  const known = [...new Set(tcs.flatMap((t) => (bugsByTc.get(t.id) || []).map((b) => `${b} → ${t.id}`)))];
  if (known.length) parts.push(`Known bug: ${known.join(", ")}`);
  const blocked = tcs.filter((t) => /^Blocked/i.test(t.result)).map((t) => t.id);
  if (blocked.length) parts.push(`Blocked TCs: ${blocked.join(", ")}`);
  parts.push(...extra);
  if (legacy?.length) parts.push(`Legacy: ${legacy.join(", ")}`);
  parts.push(`remapped ${TODAY}`);
  return parts.join("; ");
}

const fingerprint = (ids, tcById) => hash(ids.map((id) => `${id}:${tcById.get(id)?.hash ?? "missing"}`).sort().join("|"));

function functionalCells({ id, tcs, negative, part, oldCat, legacy, bugsByTc, tcById }) {
  const features = [...new Set(tcs.map((t) => t.feature))];
  const tab = tcs[0].tab;
  const scenario = `${tab} — ${features.join(", ")}${negative ? " (negative & boundary)" : ""}${part ? ` — Part ${part}` : ""}`;
  const allBlocked = tcs.every((t) => /^Blocked/i.test(t.result));
  const ids = tcs.map((t) => t.id);
  return [
    id, "Functional", tab, tcs[0].role, scenario,
    oldCat || (negative ? "Validation & Boundary" : "Core Functional Behavior"),
    ids.join(", "), String(ids.length), priorityOf(tcs), ROLE_PRE[tcs[0].role],
    `UI test on the ${tab} ${tcs[0].role.toLowerCase()} flow: ${features.join(", ")}. Seed state via API, interact through page objects, assert each covered TC's expected result.`,
    `Every covered TC expectation holds for ${tab} — ${features.join(", ")}.`,
    "Regression", allBlocked ? "Blocked" : "Planned",
    notesFor({ tcs, bugsByTc, legacy }),
    fingerprint(ids, tcById),
  ];
}

/** Packs ordered TCs of one domain into functional row specs (no IDs yet). */
function packDomain(tcs) {
  const { min, max } = CONFIG.grouping;
  const out = [];
  const keyOf = (t) => `${t.role}\u0001${t.epic}`;
  const groups = new Map();
  for (const t of tcs) {
    if (!groups.has(keyOf(t))) groups.set(keyOf(t), []);
    groups.get(keyOf(t)).push(t);
  }
  for (const list of groups.values()) {
    // A whole epic that fits in one row stays together; only big epics split positive / negative.
    if (list.length <= max) { out.push({ tcs: [...list], negative: list.every(isNegative) }); continue; }
    for (const negative of [false, true]) {
      const slice = list.filter((t) => isNegative(t) === negative);
      // units = features in sheet order
      const units = [];
      for (const t of slice) {
        const u = units.find((x) => x.feature === t.feature);
        if (u) u.tcs.push(t);
        else units.push({ feature: t.feature, tcs: [t] });
      }
      let cur = [];
      const flush = () => { if (cur.length) out.push({ tcs: cur, negative }); cur = []; };
      for (const u of units) {
        if (u.tcs.length > max) {
          flush();
          const parts = Math.ceil(u.tcs.length / max);
          const size = Math.ceil(u.tcs.length / parts);
          for (let p = 0; p < parts; p++) out.push({ tcs: u.tcs.slice(p * size, (p + 1) * size), negative, part: p + 1 });
          continue;
        }
        if (cur.length + u.tcs.length > max) flush();
        cur.push(...u.tcs);
      }
      flush();
    }
  }
  // Merge undersized rows: first into a row of the same role+epic, then into the nearest row of
  // the same role (adjacent epic) — a 1-TC row is not worth its own test().
  out.sort((a, b) => a.tcs[0].row - b.tcs[0].row);
  for (const sameEpic of [true, false]) {
    for (let i = out.length - 1; i >= 0; i--) {
      const r = out[i];
      if (r.tcs.length >= min || r.part) continue;
      const fits = (o) => o && o !== r && !o.part && o.tcs[0].role === r.tcs[0].role && (!sameEpic || keyOf(o.tcs[0]) === keyOf(r.tcs[0])) && o.tcs.length + r.tcs.length <= max;
      const candidates = out.filter(fits).sort((a, b) => Math.abs(a.tcs[0].row - r.tcs[0].row) - Math.abs(b.tcs[0].row - r.tcs[0].row));
      const target = candidates[0];
      if (target) {
        target.tcs.push(...r.tcs);
        target.negative = target.negative && r.negative;
        out.splice(out.indexOf(r), 1);
      }
    }
  }
  for (const r of out) r.tcs.sort((a, b) => a.row - b.row);
  return out.sort((a, b) => a.tcs[0].row - b.tcs[0].row);
}

/** One smoke row per domain × role: an override from config, else the first positive row with the best priority. */
function markSmoke(rows) {
  const byKey = new Map();
  const score = (r) => (/negative/.test(r.cells[4]) ? 10 : 0) + PRIORITY_RANK[r.cells[8]];
  for (const r of rows) {
    if (r.cells[1] !== "Functional" || r.cells[13] === "Blocked") continue;
    const key = `${r.cells[2]}:${r.cells[3]}`;
    const override = CONFIG.smokeOverrides[key];
    const cand = byKey.get(key);
    if (override) { if (r.cells[4].includes(override) && !cand?.cells[4].includes(override)) byKey.set(key, r); continue; }
    if (!cand || score(r) < score(cand)) byKey.set(key, r);
  }
  for (const r of byKey.values()) {
    r.cells[12] = "Smoke + Regression";
    r.cells[8] = "P0";
  }
  return byKey.size;
}

// ---------------------------------------------------------------- rebuild
function rebuild(ctx) {
  const { tcTabs, tcs, old, bugsByTc, tcById, excluded } = ctx;
  const legacyOf = (ids) => [...new Set(old.rows.filter((r) => r.tcIds.some((x) => ids.includes(x))).map((r) => r.id))];
  const oldCatOf = (ids) => majority(old.rows.filter((r) => r.tcIds.some((x) => ids.includes(x))).map((r) => r.cells[5]), "");
  const rows = [];
  for (const tab of tcTabs) {
    const dom = CONFIG.domains[tab];
    if (!dom) continue;
    const list = tcs.filter((t) => t.tab === tab && !excluded.has(t.id));
    let n = 0;
    for (const spec of packDomain(list)) {
      const id = `AUT-${dom}-${String(++n).padStart(3, "0")}`;
      const ids = spec.tcs.map((t) => t.id);
      rows.push({ id, cells: functionalCells({ id, tcs: spec.tcs, negative: spec.negative, part: spec.part, oldCat: oldCatOf(ids), legacy: legacyOf(ids), bugsByTc, tcById }) });
    }
  }
  const e2eReport = [];
  let e = 0;
  for (const o of old.rows.filter((r) => /^AUT-E2E-/.test(r.id))) {
    if (CONFIG.exclude.e2e[o.id]) { e2eReport.push(`- ${o.id} dropped — ${CONFIG.exclude.e2e[o.id]}`); continue; }
    const kept = o.tcIds.filter((x) => tcById.has(x) && !excluded.has(x));
    const dropped = o.tcIds.filter((x) => !kept.includes(x));
    const id = `AUT-E2E-${++e}`;
    const tcsOf = kept.map((x) => tcById.get(x));
    const blockedReason = o.cells[13] === "Blocked" ? [`Blocked: ${o.cells[14].replace(/;.*$/s, "").slice(0, 160)}`] : [];
    const cells = [...o.cells];
    cells[0] = id; cells[1] = "E2E"; cells[6] = kept.join(", "); cells[7] = String(kept.length);
    cells[13] = o.cells[13] === "Blocked" ? "Blocked" : "Planned";
    cells[14] = notesFor({ tcs: tcsOf, bugsByTc, legacy: [o.id], extra: blockedReason });
    cells[15] = fingerprint(kept, tcById);
    rows.push({ id, cells });
    e2eReport.push(`- ${id} ← ${o.id} · ${o.cells[4]} · ${kept.length} TC${dropped.length ? ` (dropped ${dropped.length}: ${dropped.join(", ")})` : ""}`);
  }
  const smoke = markSmoke(rows);
  return { rows, e2eReport, smoke };
}

// ---------------------------------------------------------------- lifecycle sync
const readState = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {});

function sync(ctx, prev = readState()) {
  const { tcs, old, bugsByTc, tcById, excluded } = ctx;
  const changes = [];
  const renames = new Map();
  const rows = old.rows.map((r) => ({ id: r.id, cells: [...r.cells], tcIds: [...r.tcIds] }));
  // Rows taken out of scope by config.exclude.rows: Planned-like rows go, Automated rows retire.
  for (let i = rows.length - 1; i >= 0; i--) {
    const reason = (CONFIG.exclude.rows || {})[rows[i].id];
    if (!reason) continue;
    if (rows[i].cells[13] === "Automated" || rows[i].cells[13] === "Retired") {
      if (rows[i].cells[13] !== "Retired") { rows[i].cells[13] = "Retired"; changes.push(`${rows[i].id}: excluded (${reason}) → Retired`); }
    } else { changes.push(`${rows[i].id}: excluded (${reason}) → removed`); rows.splice(i, 1); }
  }
  const covered = new Set(rows.flatMap((r) => r.tcIds));
  const missing = [...covered].filter((id) => !tcById.has(id));
  const uncovered = tcs.filter((t) => !covered.has(t.id) && !excluded.has(t.id));
  for (const id of missing) {
    const match = prev[id] && uncovered.find((t) => t.hash === prev[id] && ![...renames.values()].includes(t.id));
    if (match) renames.set(id, match.id);
  }
  for (const r of rows) {
    const before = r.tcIds.join(",");
    r.tcIds = r.tcIds.map((x) => renames.get(x) || x).filter((x) => tcById.has(x) && !excluded.has(x));
    if (r.tcIds.join(",") !== before) changes.push(`${r.id}: covered TCs ${before} → ${r.tcIds.join(",") || "(none)"}`);
  }
  for (const [a, b] of renames) changes.push(`rename ${a} → ${b}`);
  // empty rows
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (r.tcIds.length) continue;
    if (r.cells[13] === "Automated" || r.cells[13] === "Retired") {
      if (r.cells[13] !== "Retired") { r.cells[13] = "Retired"; changes.push(`${r.id}: no TCs left → Retired`); }
    } else { rows.splice(i, 1); changes.push(`${r.id}: no TCs left → removed`); }
  }
  // new TCs
  const nowCovered = new Set(rows.flatMap((r) => r.tcIds));
  const fresh = tcs.filter((t) => !nowCovered.has(t.id) && !excluded.has(t.id));
  const leftovers = [];
  for (const t of fresh) {
    const home = rows.find((r) => r.cells[13] === "Planned" && r.tcIds.length < CONFIG.grouping.max && r.cells[1] === "Functional" &&
      r.tcIds.some((x) => { const o = tcById.get(x); return o && o.tab === t.tab && o.role === t.role && o.epic === t.epic && o.feature === t.feature; }));
    if (home) { home.tcIds.push(t.id); changes.push(`${home.id}: + ${t.id} (new TC)`); } else leftovers.push(t);
  }
  const nextNum = (dom) => Math.max(0, ...rows.filter((r) => r.id.startsWith(`AUT-${dom}-`)).map((r) => +r.id.split("-").pop())) + 1;
  for (const tab of [...new Set(leftovers.map((t) => t.tab))]) {
    const dom = CONFIG.domains[tab];
    for (const spec of packDomain(leftovers.filter((t) => t.tab === tab))) {
      const id = `AUT-${dom}-${String(nextNum(dom)).padStart(3, "0")}`;
      const cells = functionalCells({ id, tcs: spec.tcs, negative: spec.negative, part: spec.part, bugsByTc, tcById });
      rows.push({ id, cells, tcIds: spec.tcs.map((t) => t.id) });
      changes.push(`${id}: new row for ${spec.tcs.map((t) => t.id).join(", ")}`);
    }
  }
  // fingerprints, counts, known bugs
  for (const r of rows) {
    r.cells[6] = r.tcIds.join(", ");
    r.cells[7] = String(r.tcIds.length);
    const fp = r.tcIds.length ? fingerprint(r.tcIds, tcById) : r.cells[15];
    if (r.cells[15] && fp !== r.cells[15] && r.cells[13] === "Automated") { r.cells[13] = "Needs Review"; changes.push(`${r.id}: TC content changed → Needs Review`); }
    r.cells[15] = fp;
    const known = [...new Set(r.tcIds.flatMap((x) => (bugsByTc.get(x) || []).map((b) => `${b} → ${x}`)))];
    const segs = r.cells[14].split("; ").filter((s) => s && !s.startsWith("Known bug:"));
    if (known.length) segs.splice(1, 0, `Known bug: ${known.join(", ")}`);
    const notes = segs.join("; ");
    if (notes !== r.cells[14]) { changes.push(`${r.id}: known bugs → ${known.join(", ") || "none"}`); r.cells[14] = notes; }
  }
  return { rows, changes, renames };
}

// ---------------------------------------------------------------- main
async function main() {
  if (!SHEET_ID) throw new Error("YAPP_AUTOMATION_SHEET_ID is not set");
  T = await token();
  const { tcTabs, tcs, mapping, bugs, clar } = await load();
  const tcById = new Map(tcs.map((t) => [t.id, t]));
  const excludedReason = new Map(tcs.map((t) => [t.id, exclusionOf(t)]).filter(([, r]) => r));
  const excluded = new Set(excludedReason.keys());
  const bugsByTc = openBugs(bugs);
  const old = parseMapping(mapping);
  const ctx = { tcTabs, tcs, old, bugsByTc, tcById, excluded };
  const report = [`# Automation Mapping ${REBUILD ? "rebuild" : "sync"} — ${TODAY}${WRITE ? "" : " (dry-run)"}`, ""];

  let rows, renames = new Map();
  if (REBUILD) {
    const res = rebuild(ctx);
    rows = res.rows;
    const byDom = rows.reduce((m, r) => ((m[r.cells[2]] = m[r.cells[2]] || { rows: 0, tcs: 0 }), m[r.cells[2]].rows++, (m[r.cells[2]].tcs += +r.cells[7]), m), {});
    const st = rows.reduce((m, r) => ((m[r.cells[13]] = (m[r.cells[13]] || 0) + 1), m), {});
    const sizes = rows.filter((r) => r.cells[1] === "Functional").map((r) => +r.cells[7]);
    report.push(
      "## Angka", "",
      `- Mapping lama: ${old.rows.length} baris → baru: **${rows.length} baris** (${rows.filter((r) => r.cells[1] === "Functional").length} Functional, ${rows.filter((r) => r.cells[1] === "E2E").length} E2E)`,
      `- Status: ${Object.entries(st).map(([k, v]) => `${k} ${v}`).join(" · ")} · baris smoke: ${res.smoke}`,
      `- TC: ${tcs.length} total · ${excluded.size} dikeluarkan · ${tcs.length - excluded.size} dipetakan`,
      `- Ukuran baris Functional: min ${Math.min(...sizes)} · max ${Math.max(...sizes)} · rata-rata ${(sizes.reduce((a, b) => a + b, 0) / sizes.length).toFixed(1)} · <3 TC: ${sizes.filter((n) => n < 3).length}`,
      `- Baris dengan Known bug: ${rows.filter((r) => r.cells[14].includes("Known bug:")).length}`, "",
      "## Per domain", "", "| Domain | Baris | TC |", "|---|---|---|",
      ...Object.entries(byDom).map(([d, x]) => `| ${d} | ${x.rows} | ${x.tcs} |`), "",
      "## E2E", "", ...res.e2eReport, "",
      "## Baris smoke (Run Scope `Smoke + Regression`)", "",
      ...rows.filter((r) => r.cells[12] === "Smoke + Regression").map((r) => `- ${r.id} · ${r.cells[3]} · ${r.cells[4]}`), "",
    );
  } else {
    const res = sync(ctx);
    rows = res.rows;
    renames = res.renames;
    report.push("## Perubahan", "", ...(res.changes.length ? res.changes.map((c) => `- ${c}`) : ["Tidak ada perubahan."]), "");
  }

  // exclusions
  const exByReason = [...excludedReason].reduce((m, [id, r]) => ((m[r] = m[r] || []).push(id), m), {});
  report.push("## TC dikeluarkan", "");
  for (const [reason, ids] of Object.entries(exByReason)) {
    report.push(`### ${reason} (${ids.length})`, "");
    if (/Livestream/.test(reason)) report.push(`Semua TC tab Livestream (${ids.length}).`, "");
    else report.push(...ids.map((id) => `- ${id} · ${tcById.get(id).tab} · ${tcById.get(id).feature} · ${tcById.get(id).title}`), "");
  }

  // integrity
  const ids = rows.map((r) => r.id);
  const dupIds = ids.filter((x, i) => ids.indexOf(x) !== i);
  const cov = new Set(rows.flatMap((r) => r.cells[6].split(/[,\s]+/).filter(Boolean)));
  const unmapped = tcs.filter((t) => !excluded.has(t.id) && !cov.has(t.id)).map((t) => t.id);
  const dangling = [...cov].filter((x) => !tcById.has(x) || excluded.has(x));
  const badCount = rows.filter((r) => String(r.cells[6].split(/[,\s]+/).filter(Boolean).length) !== r.cells[7]).map((r) => r.id);
  const bugRefsMissing = bugs.slice(1).flatMap((r) => (r[8] || "").split(/[,\s]+/).filter((x) => /^TC-/.test(x) && !tcById.has(x)).map((x) => `${r[0]} → ${x}${renames.has(x) ? ` (rename → ${renames.get(x)})` : ""}`));
  report.push("## Integritas", "",
    `- ID duplikat: ${dupIds.length ? dupIds.join(", ") : "tidak ada"}`,
    `- TC tidak terpetakan (non-excluded): ${unmapped.length ? unmapped.join(", ") : "tidak ada"}`,
    `- Rujukan ke TC yang tidak ada / dikeluarkan: ${dangling.length ? dangling.join(", ") : "tidak ada"}`,
    `- TC Count tidak cocok: ${badCount.length ? badCount.join(", ") : "tidak ada"}`,
    `- Bugs \`Related TC\` ke ID yang tidak ada: ${bugRefsMissing.length ? bugRefsMissing.join(", ") : "tidak ada"}`, "");

  if (REBUILD) {
    report.push("## Baris baru", "", "| ID | Role | Scenario | TC | P | Run Scope | Status |", "|---|---|---|---|---|---|---|",
      ...rows.map((r) => `| ${r.id} | ${r.cells[3]} | ${r.cells[4].replace(/\|/g, "/")} | ${r.cells[7]} | ${r.cells[8]} | ${r.cells[12]} | ${r.cells[13]} |`), "");
  }

  fs.mkdirSync(WORK, { recursive: true });
  fs.writeFileSync(REPORT, report.join("\n"), "utf8");

  if (WRITE) {
    if (dupIds.length || dangling.length || badCount.length) throw new Error("Integrity check failed — see report; nothing written");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.writeFileSync(path.join(WORK, `automation-mapping-backup-${stamp}.json`), JSON.stringify({ mapping, clarifications: clar, bugs }, null, 1));
    const header = Array.from({ length: COLS }, (_, i) => norm(old.header[i]));
    header[15] = FP_HEADER;
    const data = [{ range: range(MAPPING, `A1:P${rows.length + 1}`), values: [header, ...rows.map((r) => r.cells)] }];
    // clarifications: point each TC at the row that now covers it
    const rowOf = new Map(rows.flatMap((r) => r.cells[6].split(/[,\s]+/).filter(Boolean).map((x) => [x, r.id])));
    clar.slice(1).forEach((c, i) => {
      const tcId = renames.get(norm(c[2])) || norm(c[2]);
      if (!/^CL-/.test(norm(c[0]))) return;
      const target = rowOf.get(tcId) || (excluded.has(tcId) ? "(excluded)" : norm(c[1]));
      if (target !== norm(c[1])) data.push({ range: range(CLARIFICATIONS, `B${i + 2}`), values: [[target]] });
      if (tcId !== norm(c[2])) data.push({ range: range(CLARIFICATIONS, `C${i + 2}`), values: [[tcId]] });
    });
    // bugs: renamed TC IDs in Related TC
    if (renames.size) bugs.slice(1).forEach((b, i) => {
      const rel = norm(b[8]);
      const next = rel.replace(/TC-[A-Z0-9-]+/g, (x) => renames.get(x) || x);
      if (next !== rel) data.push({ range: range("Bugs", `I${i + 2}`), values: [[next]] });
    });
    await api("/values:batchUpdate", { method: "POST", body: JSON.stringify({ valueInputOption: "RAW", data }) });
    if (mapping.length > rows.length + 1) await api("/values:batchClear", { method: "POST", body: JSON.stringify({ ranges: [range(MAPPING, `A${rows.length + 2}:P${mapping.length + 5}`)] }) });
    fs.writeFileSync(STATE, JSON.stringify(Object.fromEntries(tcs.map((t) => [t.id, t.hash])), null, 0));
  }
  console.log(`${WRITE ? "" : "[dry-run] "}${REBUILD ? "rebuild" : "sync"}: ${rows.length} rows · ${excluded.size} TC excluded · report ${path.relative(process.cwd(), REPORT)}`);
}

export { packDomain, rebuild, sync, parseMapping, exclusionOf, hash };

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((e) => {
    console.error("[mapping-sync]", e.message);
    process.exitCode = 1;
  });
}
