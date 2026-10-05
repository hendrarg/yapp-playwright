import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const TESTS_DIR = path.join(ROOT, 'tests');

// AUT-E2E-NNN, AUT-<DOM>-NNN (mapping since 2026-10-04) and legacy AUT-FV-NNN.
const TC_TAG = /@AUT-(?:E2E|[A-Z]+)-\d+/;
const FEATURE_TAGS = [
  '@cart', '@checkout', '@auth', '@membership', '@products', '@feeds', '@profile',
  '@messages', '@wallet', '@settings', '@analytics', '@campaigns', '@streaming',
  '@affiliate', '@referral', '@promotions', '@sessions', '@network-mock', '@payment',
  '@explore', '@landing', '@follow', '@library', '@chart', '@message', '@like', '@comment', '@media', '@tip',
];
const ROLE_TAGS = ['@buyer', '@creator'];
const PRIORITY_TAGS = ['@smoke', '@regression', '@sanity'];

function walkSpecFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkSpecFiles(full));
    else if (entry.name.endsWith('.spec.ts')) results.push(full);
  }
  return results;
}

function extractTagBlocks(content) {
  const blocks = [];
  const re = /tag:\s*\[([^\]]*)\]/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    blocks.push({ tags: match[1], index: match.index });
  }
  return blocks;
}

function lineNumber(content, index) {
  return content.slice(0, index).split('\n').length;
}

function hasAny(tags, candidates) {
  return candidates.some((tag) => tags.includes(tag));
}

let exitCode = 0;
const files = walkSpecFiles(TESTS_DIR);

console.log('Tag compliance audit\n');

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const blocks = extractTagBlocks(content);

  if (blocks.length === 0) {
    exitCode = 1;
    console.log(`${rel}`);
    console.log('  [missing-tags] No tag: [...] declaration found');
    console.log('');
    continue;
  }

  blocks.forEach((block, i) => {
    const tagStrings = [...block.tags.matchAll(/'(@[^']+)'|"(@[^"]+)"/g)].map((m) => m[1] ?? m[2]);
    const issues = [];

    if (!tagStrings.some((tag) => TC_TAG.test(tag))) {
      issues.push('missing @AUT-E2E-* or @AUT-<DOM>-* tag');
    }
    const hasFeatureLike = tagStrings.some(
      (t) =>
        FEATURE_TAGS.includes(t) ||
        (!ROLE_TAGS.includes(t) &&
          !PRIORITY_TAGS.includes(t) &&
          !TC_TAG.test(t) &&
          t !== '@flaky' &&
          t !== '@slow' &&
          t !== '@api'),
    );
    if (!hasFeatureLike) issues.push('missing feature tag');
    if (!hasAny(tagStrings, ROLE_TAGS)) issues.push('missing role tag (@buyer or @creator)');
    if (!hasAny(tagStrings, PRIORITY_TAGS)) issues.push('missing priority tag (@smoke, @regression, or @sanity)');

    if (issues.length > 0) {
      exitCode = 1;
      console.log(`${rel} (tag block ${i + 1}, line ${lineNumber(content, block.index)})`);
      for (const issue of issues) console.log(`  [${issue}] tags: ${tagStrings.join(', ') || '(none parsed)'}`);
      console.log('');
    }
  });
}

if (exitCode === 0) {
  console.log('All spec tag blocks include @AUT-*, feature, role, and priority tags.');
}

/**
 * `--mapping`: compare test tags with Automation Mapping (advisory — never changes the exit code).
 * Reports legacy tags (IDs no longer in the sheet), tagged tests whose row is not Automated yet,
 * Automated rows without a test, and @smoke tags that disagree with the row's Run Scope.
 */
async function auditAgainstMapping() {
  const { sheetsClient, quoteTab } = await import('./lib/sheets-client.mjs');
  const sheets = await sheetsClient();
  const rows = (await sheets.values(`${quoteTab('Automation Mapping')}!A2:N1000`)).filter((r) => /^AUT-/.test(r[0] ?? ''));
  const byId = new Map(rows.map((r) => [r[0].trim(), { status: (r[13] ?? '').trim(), smoke: /^Smoke/.test((r[12] ?? '').trim()) }]));

  const tests = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    for (const block of extractTagBlocks(content)) {
      const tagStrings = [...block.tags.matchAll(/'(@[^']+)'|"(@[^"]+)"/g)].map((m) => m[1] ?? m[2]);
      for (const t of tagStrings.filter((x) => TC_TAG.test(x))) {
        tests.push({ id: t.slice(1), file: rel, line: lineNumber(content, block.index), smoke: tagStrings.includes('@smoke') });
      }
    }
  }
  const tagged = new Set(tests.map((t) => t.id));
  const legacy = tests.filter((t) => !byId.has(t.id));
  const notAutomated = tests.filter((t) => byId.has(t.id) && byId.get(t.id).status !== 'Automated');
  const automatedNoTest = rows.filter((r) => r[13]?.trim() === 'Automated' && !tagged.has(r[0].trim())).map((r) => r[0].trim());
  const smokeMismatch = tests.filter((t) => byId.has(t.id) && byId.get(t.id).smoke !== t.smoke);

  console.log('\nAutomation Mapping audit (--mapping)\n');
  const automated = rows.filter((r) => r[13]?.trim() === 'Automated').length;
  console.log(`Mapping: ${automated}/${rows.length} rows Automated · tests tagged with a mapped ID: ${tests.length - legacy.length} · legacy tags: ${legacy.length}`);

  const perFile = legacy.reduce((m, t) => ((m[t.file] = (m[t.file] ?? 0) + 1), m), {});
  if (legacy.length) {
    console.log('\nLegacy tags (not in Automation Mapping) per spec:');
    for (const [f, n] of Object.entries(perFile).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${f}`);
  }
  if (notAutomated.length) {
    console.log('\nTagged with a mapped ID but the row is not Automated (run it, then `npm run mapping:sync -- --set-status <ID> Automated`):');
    for (const t of notAutomated) console.log(`  ${t.id} (${byId.get(t.id).status || 'blank'}) — ${t.file}:${t.line}`);
  }
  if (automatedNoTest.length) console.log(`\nAutomated rows with no test carrying the tag: ${automatedNoTest.join(', ')}`);
  if (smokeMismatch.length) {
    console.log('\n@smoke disagrees with the row Run Scope:');
    for (const t of smokeMismatch) console.log(`  ${t.id} — test ${t.smoke ? 'has' : 'lacks'} @smoke, row is ${byId.get(t.id).smoke ? 'Smoke' : 'Regression'} — ${t.file}:${t.line}`);
  }
  if (!legacy.length && !notAutomated.length && !automatedNoTest.length && !smokeMismatch.length) console.log('Tests and Automation Mapping agree.');
}

if (process.argv.includes('--mapping')) {
  auditAgainstMapping()
    .catch((e) => console.error('[audit-tags --mapping]', e.message))
    .finally(() => process.exit(exitCode));
} else {
  process.exit(exitCode);
}
