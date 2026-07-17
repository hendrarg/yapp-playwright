# Sheet Automation Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/automation <AUT-ID>` support that validates and assembles mapping plus manual-TC data directly from Google Sheets for Playwright draft generation.

**Architecture:** A single dependency-free Node ESM script reads Google Visualization JSON, builds a global TC index from all source sheets named by Automation Mapping, rejects invalid or blocked input, and prints normalized JSON for the existing agent workflow. Repository command and skill documents tell the agent how to consume that context and continue through existing page-object, type-check, and isolated Playwright validation steps.

**Tech Stack:** Node 24 built-in `fetch`, `node:test`, JavaScript ESM, existing Playwright/TypeScript repository workflow.

## Global Constraints

- Do not create intermediate Markdown test cases.
- Do not add a package dependency, service, database, selector registry, dashboard, or DSL.
- Process exactly one `AUT-E2E-*` or `AUT-FV-*` ID per command.
- Keep manual TC sheets as the source of truth and stop rather than guess on invalid or blocked input.
- Keep locators in existing page objects and follow the repository selector priority.
- Run only the generated automation or source TC tags during verification.

## File Structure

- Create `scripts/automation-context.mjs`: Google Sheets reader, GViz parser, global TC index, validation, clarification gate, and CLI.
- Create `scripts/automation-context.test.mjs`: focused `node:test` checks for parsing and validation behavior.
- Modify `package.json`: add context-builder and unit-test scripts.
- Modify `.env.example`: document the spreadsheet, mapping GID, and clarification-sheet settings.
- Create `.agents/commands/automation.md`: repository command entry point.
- Modify `.agents/skills/add-test-spec/SKILL.md`: accept structured Sheet context as an alternative to local Markdown and document E2E/FV generation rules.
- Modify `AGENTS.md`: document the new environment variables and direct Sheet workflow.

---

### Task 1: Parse Google Visualization rows

**Files:**
- Create: `scripts/automation-context.mjs`
- Create: `scripts/automation-context.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `parseGviz(text: string, sheetName: string): Array<Record<string, string | number> & { _source: { sheet: string; row: number } }>`
- Produces: `npm run test:automation-context`

- [ ] **Step 1: Add the failing parser test**

Create `scripts/automation-context.test.mjs`:

```js
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
```

Add to `package.json`:

```json
"scripts": {
  "test": "playwright test",
  "test:automation-context": "node --test scripts/automation-context.test.mjs"
}
```

- [ ] **Step 2: Run the parser test and verify RED**

Run:

```powershell
npm run test:automation-context
```

Expected: FAIL because `scripts/automation-context.mjs` does not exist.

- [ ] **Step 3: Implement the minimal parser**

Create `scripts/automation-context.mjs`:

```js
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
```

- [ ] **Step 4: Run the parser test and verify GREEN**

Run:

```powershell
npm run test:automation-context
```

Expected: 1 test passes.

- [ ] **Step 5: Commit the parser cycle**

```powershell
git add package.json scripts/automation-context.mjs scripts/automation-context.test.mjs
git commit -m "feat: parse automation sheet rows"
```

---

### Task 2: Build and validate one Automation ID context

**Files:**
- Modify: `scripts/automation-context.mjs`
- Modify: `scripts/automation-context.test.mjs`

**Interfaces:**
- Consumes: `parseGviz(text, sheetName)` from Task 1.
- Produces: `buildAutomationContext(automationId, mappings, sourceSheets, clarifications): AutomationContext`.
- Produces normalized `sourceCases` entries with `id`, `epic`, `feature`, `title`, `preconditions`, `steps`, `expected`, `notes`, `sourceSheet`, and `sourceRow`.

- [ ] **Step 1: Add failing happy-path and validation tests**

Change the existing import to:

```js
import { buildAutomationContext, parseGviz } from './automation-context.mjs';
```

Then append:

```js

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
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm run test:automation-context
```

Expected: parser test passes; new tests fail because `buildAutomationContext` is not exported.

- [ ] **Step 3: Implement minimal global indexing and validation**

Append to `scripts/automation-context.mjs`:

```js
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
```

- [ ] **Step 4: Run tests and verify GREEN**

Run:

```powershell
npm run test:automation-context
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit the validation cycle**

```powershell
git add scripts/automation-context.mjs scripts/automation-context.test.mjs
git commit -m "feat: validate automation mapping context"
```

---

### Task 3: Add the live CLI and repository workflow

**Files:**
- Modify: `scripts/automation-context.mjs`
- Modify: `scripts/automation-context.test.mjs`
- Modify: `package.json`
- Modify: `.env.example`
- Create: `.agents/commands/automation.md`
- Modify: `.agents/skills/add-test-spec/SKILL.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: `parseGviz` and `buildAutomationContext` from Tasks 1-2.
- Produces: `npm run automation:context -- AUT-E2E-002` printing normalized JSON to stdout.
- Reads: `YAPP_AUTOMATION_SHEET_ID`, `YAPP_AUTOMATION_MAPPING_GID`, and optional `YAPP_AUTOMATION_CLARIFICATIONS_SHEET`.

- [ ] **Step 1: Add a failing URL-construction test**

Append to `scripts/automation-context.test.mjs`:

```js
import { buildSheetUrl } from './automation-context.mjs';

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
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm run test:automation-context
```

Expected: existing tests pass; the new test fails because `buildSheetUrl` is not exported.

- [ ] **Step 3: Implement URL building, Sheet loading, and CLI orchestration**

Add imports and functions to `scripts/automation-context.mjs`:

```js
import 'dotenv/config';
import { pathToFileURL } from 'node:url';

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
```

Add to `package.json`:

```json
"automation:context": "node scripts/automation-context.mjs"
```

- [ ] **Step 4: Run unit tests and verify GREEN**

Run:

```powershell
npm run test:automation-context
```

Expected: 4 tests pass.

- [ ] **Step 5: Document configuration and workflow**

Append to `.env.example` and the AGENTS environment-variable table:

```text
YAPP_AUTOMATION_SHEET_ID=12ECspl722v6FUpXedXSef_A4IRRKpWOXD4lYxuLuoHM
YAPP_AUTOMATION_MAPPING_GID=1448466957
YAPP_AUTOMATION_CLARIFICATIONS_SHEET=Automation Clarifications
```

Create `.agents/commands/automation.md` describing:

```text
1. Run npm run automation:context -- <AUT-ID>.
2. Stop and report the exact blockers when the command fails.
3. Read reuse-patterns and inspect existing page objects/helpers.
4. For E2E, generate one journey with source-TC annotations.
5. For FV, generate one describe group and keep independently failing cases separate.
6. Run npx tsc --noEmit and only the generated automation/source-TC tags.
```

Update `.agents/skills/add-test-spec/SKILL.md` so `/tc <AT-ID>` retains the current Markdown path and `/automation <AUT-ID>` uses the structured context command above. Do not duplicate the existing page-object, test-data, locator, type-check, or isolated-run rules.

- [ ] **Step 6: Verify documentation and TypeScript compatibility**

Run:

```powershell
npm run test:automation-context
npx tsc --noEmit
rg -n "automation:context|YAPP_AUTOMATION_SHEET_ID|/automation" package.json .env.example AGENTS.md .agents/commands/automation.md .agents/skills/add-test-spec/SKILL.md
```

Expected: unit tests pass, TypeScript exits 0, and every new workflow reference is found.

- [ ] **Step 7: Commit the CLI workflow**

```powershell
git add package.json .env.example AGENTS.md scripts/automation-context.mjs scripts/automation-context.test.mjs .agents/commands/automation.md .agents/skills/add-test-spec/SKILL.md
git commit -m "feat: generate automation context from sheets"
```

---

### Task 4: Verify one E2E and one small FV mapping

**Files:**
- Modify only if a verified defect is found in `scripts/automation-context.mjs` or its test.

**Interfaces:**
- Consumes: `npm run automation:context -- <AUT-ID>` from Task 3.
- Produces: validated JSON contexts for one E2E golden sample and one FV group containing two to four source cases.

- [ ] **Step 1: Run the E2E golden sample context**

Run with `.env` containing the three documented variables:

```powershell
npm run automation:context -- AUT-E2E-008
```

Expected: exit 0; JSON contains `automationId: "AUT-E2E-008"` and 12 resolved source cases from all relevant source sheets, unless an open clarification intentionally blocks it.

- [ ] **Step 2: Run the small FV context**

```powershell
npm run automation:context -- AUT-FV-013
```

Expected: exit 0; JSON contains `automationId: "AUT-FV-013"` and two resolved source cases, unless an open clarification intentionally blocks it.

- [ ] **Step 3: Handle only evidenced defects with TDD**

If either command exposes a parser or validation defect, add one failing fixture-based test reproducing that exact response, run it to confirm RED, make the smallest implementation change, and rerun to GREEN. Do not weaken valid blockers or bypass clarification status.

- [ ] **Step 4: Run final verification**

```powershell
npm run test:automation-context
npx tsc --noEmit
git diff --check
git status --short
```

Expected: all context-builder tests pass, TypeScript exits 0, the diff has no whitespace errors, and only intended files are changed.
