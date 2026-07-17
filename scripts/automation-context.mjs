import 'dotenv/config';
import { pathToFileURL } from 'node:url';

export function parseGviz(text, sheetName) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error(`Invalid GViz response for ${sheetName}`);

  const response = JSON.parse(text.slice(start, end + 1));
  if (response.status !== 'ok') {
    throw new Error(`Unable to read ${sheetName}: ${response.errors?.[0]?.detailed_message ?? response.status}`);
  }

  let labels = response.table.cols.map((column) => column.label);
  let rows = response.table.rows;
  const firstRow = rows[0]?.c?.map((cell) => cell?.v ?? '') ?? [];
  if (!labels.some(Boolean) && firstRow.some(Boolean)) {
    labels = firstRow;
    rows = rows.slice(1);
  }

  const columns = labels.map((label, index) => ({ label, index })).filter(({ label }) => label);
  return rows.map((row, index) => ({
    ...Object.fromEntries(columns.map(({ label, index: column }) => [label, row.c?.[column]?.v ?? ''])),
    _source: { sheet: sheetName, row: index + 2 },
  }));
}

const splitIds = (value) => String(value).split(',').map((id) => id.trim()).filter(Boolean);

export function buildAutomationContext(automationId, mappings, sourceSheets, clarifications = []) {
  if (!/^AUT-(E2E|FV)-\d+$/.test(automationId)) throw new Error(`Invalid Automation ID: ${automationId}`);

  const matches = mappings.filter((row) => row['Automation ID'] === automationId);
  if (matches.length !== 1) throw new Error(`${automationId} appears ${matches.length} times in Automation Mapping`);

  const mapping = matches[0];
  const coveredIds = splitIds(mapping['Covered TC IDs']);
  const index = new Map();
  for (const rows of Object.values(sourceSheets)) {
    for (const row of rows) {
      const id = String(row['Test Case ID'] ?? '').trim();
      if (!id) continue;
      index.set(id, [...(index.get(id) ?? []), row]);
    }
  }

  const errors = [];
  if (Number(mapping['TC Count']) !== coveredIds.length) {
    errors.push(`TC Count expected ${mapping['TC Count']} but found ${coveredIds.length}`);
  }

  const coveredCounts = new Map();
  for (const id of coveredIds) coveredCounts.set(id, (coveredCounts.get(id) ?? 0) + 1);
  for (const [id, count] of coveredCounts) {
    if (count > 1) errors.push(`${id} appears ${count} times in Covered TC IDs`);
  }

  const resolved = [];
  for (const id of coveredIds) {
    const rows = index.get(id) ?? [];
    if (rows.length === 0) errors.push(`${id} was not found`);
    if (rows.length > 1) errors.push(`${id} appears ${rows.length} times`);
    if (id.includes('-GAP-')) errors.push(`${id} is a GAP case`);
    if (rows.length === 1 && !id.includes('-GAP-')) {
      if (!String(rows[0].Steps).trim()) errors.push(`${id} has empty Steps`);
      if (!String(rows[0]['Expected Result']).trim()) errors.push(`${id} has empty Expected Result`);
      resolved.push(rows[0]);
    }
  }

  for (const clarification of clarifications.filter(
    (row) => row['Automation ID'] === automationId && String(row.Status).trim().toLowerCase() !== 'resolved',
  )) {
    errors.push(`Open clarification ${clarification['Clarification ID']}`);
  }

  if (errors.length) throw new Error(errors.join('\n'));

  return {
    automationId,
    layer: mapping.Layer,
    role: mapping.Role,
    scenario: mapping['Automation Scenario'],
    sourceSheet: mapping['Domain / Source Sheet'],
    coverageCategory: mapping['Coverage Category'],
    priority: mapping.Priority,
    preconditions: mapping['Preconditions / Test Data'],
    flow: mapping['Automation Flow / Validation'],
    expectedOutcome: mapping['Expected Outcome'],
    runScope: mapping['Run Scope'],
    notes: mapping.Notes,
    sourceCases: resolved.map((row) => ({
      id: row['Test Case ID'],
      epic: row.Epic,
      feature: row.Feature,
      title: row['Test Case Title'],
      preconditions: row.Preconditions,
      steps: row.Steps,
      expected: row['Expected Result'],
      notes: row['notes Web'],
      sourceSheet: row._source.sheet,
      sourceRow: row._source.row,
    })),
  };
}

export function buildSheetUrl(spreadsheetId, { gid, sheet }) {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq`);
  url.searchParams.set('tqx', 'out:json');
  if (gid) url.searchParams.set('gid', gid);
  if (sheet) url.searchParams.set('sheet', sheet);
  return url.toString();
}

async function readSheet(spreadsheetId, selector, sourceName) {
  const response = await fetch(buildSheetUrl(spreadsheetId, selector));
  if (!response.ok) throw new Error(`Unable to read ${sourceName}: HTTP ${response.status}`);
  return parseGviz(await response.text(), sourceName);
}

export async function loadAutomationContext(automationId, env = process.env) {
  const spreadsheetId = env.YAPP_AUTOMATION_SHEET_ID;
  const mappingGid = env.YAPP_AUTOMATION_MAPPING_GID;
  const clarificationSheet = env.YAPP_AUTOMATION_CLARIFICATIONS_SHEET ?? 'Automation Clarifications';
  if (!spreadsheetId || !mappingGid) {
    throw new Error('YAPP_AUTOMATION_SHEET_ID and YAPP_AUTOMATION_MAPPING_GID are required');
  }

  const mappings = await readSheet(spreadsheetId, { gid: mappingGid }, 'Automation Mapping');
  const sourceNames = [...new Set(mappings.map((row) => String(row['Domain / Source Sheet']).trim()).filter(Boolean))];
  const entries = await Promise.all(sourceNames.map(async (sheet) => [
    sheet,
    await readSheet(spreadsheetId, { sheet }, sheet),
  ]));
  const clarifications = await readSheet(spreadsheetId, { sheet: clarificationSheet }, clarificationSheet);
  return buildAutomationContext(automationId, mappings, Object.fromEntries(entries), clarifications);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const automationId = process.argv[2];
  loadAutomationContext(automationId)
    .then((context) => process.stdout.write(`${JSON.stringify(context, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}
