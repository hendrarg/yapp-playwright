/**
 * Minimal Google Sheets client for repo scripts, authenticated with the service account in
 * `.google-sheets-service-account.json` (git-ignored). Works without the Google Sheets MCP.
 *
 *   const sheets = await sheetsClient({ write: true });
 *   const values = await sheets.values("'Automation Mapping'!A1:P10");
 *   await sheets.batchUpdate([{ range: "'Automation Mapping'!N5", values: [["Automated"]] }]);
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import "dotenv/config";

export const quoteTab = (tab) => `'${tab.replace(/'/g, "''")}'`;

export async function sheetsClient({ write = false, spreadsheetId = process.env.YAPP_AUTOMATION_SHEET_ID } = {}) {
  if (!spreadsheetId) throw new Error("YAPP_AUTOMATION_SHEET_ID is not set");
  const keyFile = path.resolve(".google-sheets-service-account.json");
  if (!fs.existsSync(keyFile)) throw new Error(`Service account key not found: ${keyFile}`);
  const sa = JSON.parse(fs.readFileSync(keyFile, "utf8"));
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const scope = `https://www.googleapis.com/auth/spreadsheets${write ? "" : ".readonly"}`;
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, scope, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const sig = crypto.sign("RSA-SHA256", Buffer.from(unsigned), sa.private_key).toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }) });
  const tok = await res.json();
  if (!tok.access_token) throw new Error("Sheets auth failed: " + JSON.stringify(tok).slice(0, 200));

  async function api(p, opts = {}) {
    const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${p}`, { ...opts, headers: { authorization: `Bearer ${tok.access_token}`, "content-type": "application/json" } });
    const j = await r.json();
    if (!r.ok) throw new Error(`Sheets ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
    return j;
  }
  return {
    api,
    /** Values of one A1 range (empty array when the range is blank). */
    values: async (a1) => (await api(`/values/${encodeURIComponent(a1)}`)).values || [],
    /** Values of several A1 ranges, in order. */
    batchGet: async (ranges) => (await api(`/values:batchGet?${ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&")}`)).valueRanges.map((v) => v.values || []),
    batchUpdate: (data) => api("/values:batchUpdate", { method: "POST", body: JSON.stringify({ valueInputOption: "RAW", data }) }),
    batchClear: (ranges) => api("/values:batchClear", { method: "POST", body: JSON.stringify({ ranges }) }),
    tabTitles: async () => (await api("?fields=sheets.properties.title")).sheets.map((s) => s.properties.title),
  };
}
