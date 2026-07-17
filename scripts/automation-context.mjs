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
