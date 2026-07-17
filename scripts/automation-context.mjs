export function parseGviz(text, sheetName) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error(`Invalid GViz response for ${sheetName}`);

  const response = JSON.parse(text.slice(start, end + 1));
  if (response.status !== 'ok') {
    throw new Error(`Unable to read ${sheetName}: ${response.errors?.[0]?.detailed_message ?? response.status}`);
  }

  const labels = response.table.cols.map((column) => column.label);
  return response.table.rows.map((row, index) => ({
    ...Object.fromEntries(labels.map((label, column) => [label, row.c?.[column]?.v ?? ''])),
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
    (row) => row['Automation ID'] === automationId && String(row.Status).toLowerCase() !== 'resolved',
  )) {
    errors.push(`Open clarification ${clarification['Clarification ID']}`);
  }

  if (errors.length) throw new Error(errors.join('\n'));

  return {
    automationId,
    layer: mapping.Layer,
    role: mapping.Role,
    scenario: mapping['Automation Scenario'],
    priority: mapping.Priority,
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
