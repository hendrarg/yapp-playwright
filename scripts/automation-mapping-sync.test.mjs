import { test } from "node:test";
import assert from "node:assert/strict";
import { packDomain, rebuild, sync, parseMapping, hash } from "./automation-mapping-sync.mjs";

const HEADER = ["Automation ID", "Layer", "Domain / Source Sheet", "Role", "Automation Scenario", "Coverage Category", "Covered TC IDs", "TC Count", "Priority", "", "Automation Flow / Validation", "Expected Outcome", "Run Scope", "Automation Status", "Notes", "TC Fingerprint"];

let row = 1;
function tc(id, feature, { epic = "Creator - Tip Button", title = `Check ${id}`, result = "Passed", tab = "Tipping" } = {}) {
  row += 1;
  return { id, tab, row, epic, feature, title, steps: "1. step", expected: "ok", result, notes: "", role: /-B-/.test(id) ? "Buyer" : "Creator", hash: hash([title, "1. step", "ok"].join("\u0001")) };
}

function ctxFor(tcs, { mapping = [HEADER], bugs = new Map(), excluded = new Set() } = {}) {
  return { tcTabs: ["Tipping"], tcs, old: parseMapping(mapping), bugsByTc: bugs, tcById: new Map(tcs.map((t) => [t.id, t])), excluded };
}

/** Rebuild, then hand the rebuilt rows back as the "existing" mapping. */
function rebuiltMapping(tcs, opts) {
  const { rows } = rebuild(ctxFor(tcs, opts));
  return [HEADER, ...rows.map((r) => r.cells)];
}

test("a feature larger than the max is split into parts", () => {
  const list = Array.from({ length: 10 }, (_, i) => tc(`TC-TIP-C-${100 + i}`, "Enable Tip Button"));
  const rows = packDomain(list);
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r) => r.tcs.length <= 8));
});

test("a small epic stays in one row", () => {
  const list = [tc("TC-TIP-C-001", "A"), tc("TC-TIP-C-002", "B", { title: "Reject invalid amount" }), tc("TC-TIP-C-003", "C")];
  assert.equal(packDomain(list).length, 1);
});

test("rebuild then sync reports no changes", () => {
  const list = [tc("TC-TIP-C-001", "A"), tc("TC-TIP-C-002", "A"), tc("TC-TIP-C-003", "B")];
  const mapping = rebuiltMapping(list);
  const res = sync(ctxFor(list, { mapping }), Object.fromEntries(list.map((t) => [t.id, t.hash])));
  assert.deepEqual(res.changes, []);
});

test("a new TC joins the Planned row of its feature", () => {
  const base = [tc("TC-TIP-C-001", "A"), tc("TC-TIP-C-002", "A"), tc("TC-TIP-C-003", "A")];
  const mapping = rebuiltMapping(base);
  const added = tc("TC-TIP-C-004", "A");
  const res = sync(ctxFor([...base, added], { mapping }), {});
  assert.ok(res.rows[0].tcIds.includes("TC-TIP-C-004"));
  assert.equal(res.rows.length, 1);
});

test("a new TC next to an Automated row gets its own row", () => {
  const base = [tc("TC-TIP-C-001", "A"), tc("TC-TIP-C-002", "A"), tc("TC-TIP-C-003", "A")];
  const mapping = rebuiltMapping(base);
  mapping[1][13] = "Automated";
  const res = sync(ctxFor([...base, tc("TC-TIP-C-004", "A")], { mapping }), {});
  assert.equal(res.rows.length, 2);
  assert.equal(res.rows[1].id, "AUT-TIP-002");
});

test("deleted TCs empty a Planned row (removed) and an Automated row (Retired)", () => {
  const a = [tc("TC-TIP-C-001", "A"), tc("TC-TIP-C-002", "A"), tc("TC-TIP-C-003", "A")];
  const planned = rebuiltMapping(a);
  assert.equal(sync(ctxFor([], { mapping: planned }), {}).rows.length, 0);
  const automated = rebuiltMapping(a);
  automated[1][13] = "Automated";
  const res = sync(ctxFor([], { mapping: automated }), {});
  assert.equal(res.rows[0].cells[13], "Retired");
});

test("a renumbered TC (same content, new ID) is renamed in place", () => {
  const before = [tc("TC-TIP-C-001", "A"), tc("TC-TIP-C-002", "A"), tc("TC-TIP-C-005", "A", { title: "Moved" })];
  const mapping = rebuiltMapping(before);
  const state = Object.fromEntries(before.map((t) => [t.id, t.hash]));
  const moved = { ...before[2], id: "TC-TIP-C-003" };
  const res = sync(ctxFor([before[0], before[1], moved], { mapping }), state);
  assert.equal(res.renames.get("TC-TIP-C-005"), "TC-TIP-C-003");
  assert.ok(res.rows[0].tcIds.includes("TC-TIP-C-003"));
});

test("changed TC content flips an Automated row to Needs Review", () => {
  const list = [tc("TC-TIP-C-001", "A"), tc("TC-TIP-C-002", "A"), tc("TC-TIP-C-003", "A")];
  const mapping = rebuiltMapping(list);
  mapping[1][13] = "Automated";
  const edited = list.map((t, i) => (i === 0 ? { ...t, hash: hash("changed") } : t));
  assert.equal(sync(ctxFor(edited, { mapping }), {}).rows[0].cells[13], "Needs Review");
});

test("known bugs follow the Bugs sheet", () => {
  const list = [tc("TC-TIP-C-001", "A"), tc("TC-TIP-C-002", "A"), tc("TC-TIP-C-003", "A")];
  const mapping = rebuiltMapping(list);
  const open = sync(ctxFor(list, { mapping, bugs: new Map([["TC-TIP-C-002", ["M-50 (TIP-8)"]]]) }), {});
  assert.match(open.rows[0].cells[14], /Known bug: M-50 \(TIP-8\) → TC-TIP-C-002/);
  const closed = sync(ctxFor(list, { mapping: [HEADER, open.rows[0].cells] }), {});
  assert.doesNotMatch(closed.rows[0].cells[14], /Known bug/);
});
