import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAutomationContext, buildSheetUrl, parseGviz } from './automation-context.mjs';

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

const mapping = {
  'Automation ID': 'AUT-E2E-002',
  Layer: 'E2E Journey',
  Role: 'Cross-role',
  'Automation Scenario': 'Digital product purchase and access',
  'Covered TC IDs': 'TC-PD-C-011, TC-CART-B-004',
  'TC Count': 2,
  Priority: 'P0',
  _source: { sheet: 'Automation Mapping', row: 3 },
};

const productCase = {
  'Test Case ID': 'TC-PD-C-011',
  Epic: 'Product Content',
  Feature: 'Digital Files',
  'Test Case Title': 'Upload supported documents',
  Preconditions: 'Creator selects Digital Files',
  Steps: '1. Upload PDF',
  'Expected Result': 'PDF is accepted',
  'notes Web': 'PRD requirement',
  _source: { sheet: 'Product Digital', row: 12 },
};

const cartCase = {
  'Test Case ID': 'TC-CART-B-004',
  Epic: 'Cart',
  Feature: 'Checkout',
  'Test Case Title': 'Complete checkout',
  Preconditions: 'Product is published',
  Steps: '1. Pay for product',
  'Expected Result': 'Payment succeeds',
  'notes Web': '',
  _source: { sheet: 'Cart', row: 5 },
};

const emptyCase = {
  ...cartCase,
  'Test Case ID': 'TC-EMPTY',
  Steps: '',
  'Expected Result': '',
  _source: { sheet: 'Cart', row: 6 },
};

test('buildAutomationContext resolves covered cases across sheets', () => {
  const context = buildAutomationContext(
    'AUT-E2E-002',
    [mapping],
    { 'Product Digital': [productCase], Cart: [cartCase] },
    [],
  );

  assert.equal(context.automationId, 'AUT-E2E-002');
  assert.deepEqual(context.sourceCases.map(({ id, sourceSheet, sourceRow }) => ({ id, sourceSheet, sourceRow })), [
    { id: 'TC-PD-C-011', sourceSheet: 'Product Digital', sourceRow: 12 },
    { id: 'TC-CART-B-004', sourceSheet: 'Cart', sourceRow: 5 },
  ]);
});

test('buildAutomationContext reports all structural blockers', () => {
  assert.throws(
    () => buildAutomationContext(
      'AUT-E2E-002',
      [{ ...mapping, 'Covered TC IDs': 'TC-PD-C-011, TC-MISSING, TC-GAP-001, TC-EMPTY', 'TC Count': 3 }],
      { 'Product Digital': [productCase, productCase], Cart: [emptyCase] },
      [{ 'Automation ID': 'AUT-E2E-002', Status: 'Open', 'Clarification ID': 'CLR-0001' }],
    ),
    /TC Count expected 3 but found 4.*TC-PD-C-011 appears 2 times.*TC-MISSING was not found.*TC-GAP-001 is a GAP case.*TC-EMPTY has empty Steps.*TC-EMPTY has empty Expected Result.*Open clarification CLR-0001/s,
  );
});

test('buildSheetUrl encodes a sheet name or mapping gid', () => {
  assert.equal(
    buildSheetUrl('sheet-id', { sheet: 'Product Digital' }),
    'https://docs.google.com/spreadsheets/d/sheet-id/gviz/tq?tqx=out%3Ajson&sheet=Product+Digital',
  );
  assert.equal(
    buildSheetUrl('sheet-id', { gid: '1448466957' }),
    'https://docs.google.com/spreadsheets/d/sheet-id/gviz/tq?tqx=out%3Ajson&gid=1448466957',
  );
});
