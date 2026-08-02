#!/usr/bin/env node
/**
 * Reorder top-level test()/guestTest() blocks inside each *.spec.ts by ascending @AUT-* ID.
 * Usage:
 *   node scripts/reorder-aut-ascending.mjs           # rewrite out-of-order files
 *   node scripts/reorder-aut-ascending.mjs --check   # report only
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(process.cwd(), 'tests');
const checkOnly = process.argv.includes('--check');

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

function autSortKey(aut) {
  if (!aut) return [99, Number.MAX_SAFE_INTEGER, ''];
  const m = aut.match(/^AUT-(E2E|FV)-(\d+)$/);
  if (!m) return [50, Number.MAX_SAFE_INTEGER, aut];
  return [m[1] === 'E2E' ? 0 : 1, Number(m[2]), aut];
}

function compareAut(a, b) {
  const ka = autSortKey(a);
  const kb = autSortKey(b);
  return ka[0] - kb[0] || ka[1] - kb[1] || String(ka[2]).localeCompare(String(kb[2]));
}

function isSorted(auts) {
  for (let i = 1; i < auts.length; i++) {
    if (compareAut(auts[i - 1], auts[i]) > 0) return false;
  }
  return true;
}

function getCallName(expr) {
  if (ts.isIdentifier(expr)) return expr.text;
  return null;
}

/** Extract describe-level test()/guestTest() ranges via TS AST. */
function extractTests(source, filePath) {
  const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const tests = [];

  function visit(node, insideDescribe) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'test' &&
      node.expression.name.text === 'describe'
    ) {
      for (const arg of node.arguments) {
        if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
          visit(arg.body, true);
        }
      }
      return;
    }

    if (insideDescribe && ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)) {
      const name = getCallName(node.expression.expression);
      if (name === 'test' || name === 'guestTest') {
        const start = node.getFullStart(); // include leading trivia/whitespace carefully
        // Prefer start of statement without pulling prior test's trailing trivia too far:
        // use getStart() for code, then expand to line indent.
        let blockStart = node.getStart(sf);
        const lineStart = source.lastIndexOf('\n', blockStart - 1) + 1;
        if (/^[ \t]*$/.test(source.slice(lineStart, blockStart))) {
          blockStart = lineStart;
        }
        let blockEnd = node.getEnd();
        if (source[blockEnd] === ';') blockEnd++;
        if (source[blockEnd] === '\r') blockEnd++;
        if (source[blockEnd] === '\n') blockEnd++;

        const block = source.slice(blockStart, blockEnd);
        const tagMatch = block.match(/@(AUT-(?:E2E|FV)-\d+)/);
        tests.push({
          start: blockStart,
          end: blockEnd,
          block,
          aut: tagMatch ? tagMatch[1] : null,
        });
        return;
      }
    }

    ts.forEachChild(node, (child) => visit(child, insideDescribe));
  }

  visit(sf, false);
  return tests;
}

function reorderFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const tests = extractTests(source, filePath).filter((t) => t.aut);
  if (tests.length < 2) {
    return { filePath, changed: false, auts: tests.map((t) => t.aut) };
  }

  const auts = tests.map((t) => t.aut);
  if (isSorted(auts)) {
    return { filePath, changed: false, auts };
  }

  const sorted = [...tests].sort((a, b) => compareAut(a.aut, b.aut));
  const regionStart = tests[0].start;
  const regionEnd = tests[tests.length - 1].end;

  const onlyTests = tests.every((t, idx) => {
    if (idx === 0) return t.start === regionStart;
    const prev = tests[idx - 1];
    const gap = source.slice(prev.end, t.start);
    return /^\s*$/.test(gap);
  });

  if (!onlyTests) {
    return {
      filePath,
      changed: false,
      auts,
      skipped: true,
      reason: 'non-whitespace content between tests; reorder manually',
      sorted: sorted.map((t) => t.aut),
    };
  }

  const rebuiltTests = sorted.map((t) => t.block.replace(/\s*$/, '')).join('\n\n') + '\n';
  const next = source.slice(0, regionStart) + rebuiltTests + source.slice(regionEnd);

  if (!checkOnly) {
    fs.writeFileSync(filePath, next, 'utf8');
  }

  return {
    filePath,
    changed: true,
    auts,
    sorted: sorted.map((t) => t.aut),
  };
}

const files = walk(root);
let dirty = 0;
let skipped = 0;

for (const file of files) {
  const result = reorderFile(file);
  if (result.skipped) {
    skipped++;
    console.log(`SKIP ${path.relative(process.cwd(), file)}`);
    console.log(`  current: ${result.auts.join(', ')}`);
    console.log(`  target:  ${result.sorted.join(', ')}`);
    console.log(`  reason:  ${result.reason}`);
    continue;
  }
  if (!result.changed) continue;
  dirty++;
  console.log(`${checkOnly ? 'NEED' : 'FIXED'} ${path.relative(process.cwd(), file)}`);
  console.log(`  was: ${result.auts.join(', ')}`);
  console.log(`  now: ${result.sorted.join(', ')}`);
}

if (checkOnly) {
  if (dirty > 0 || skipped > 0) {
    console.error(`\n${dirty} file(s) out of order, ${skipped} skipped.`);
    process.exit(1);
  }
  console.log('All mapped specs are in ascending AUT order.');
} else {
  console.log(`\nRewrote ${dirty} file(s); skipped ${skipped}.`);
}
