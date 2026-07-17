import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGviz } from './automation-context.mjs';

test('parseGviz maps labeled columns and source rows', () => {
  const payload = `google.visualization.Query.setResponse(${JSON.stringify({
    status: 'ok',
    table: {
      cols: [{ label: 'Test Case ID' }, { label: 'Steps' }],
      rows: [
        { c: [{ v: 'TC-PD-C-011' }, { v: '1. Upload PDF\n2. Verify name' }] },
        { c: [{ v: 'TC-PD-C-012' }, null] },
      ],
    },
  })});`;

  assert.deepEqual(parseGviz(payload, 'Product Digital'), [
    {
      'Test Case ID': 'TC-PD-C-011',
      Steps: '1. Upload PDF\n2. Verify name',
      _source: { sheet: 'Product Digital', row: 2 },
    },
    {
      'Test Case ID': 'TC-PD-C-012',
      Steps: '',
      _source: { sheet: 'Product Digital', row: 3 },
    },
  ]);
});
