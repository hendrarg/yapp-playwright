import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const TESTS_DIR = path.join(ROOT, 'tests');

const TC_TAG = /@AUT-(?:E2E|FV)-\d+/;
const FEATURE_TAGS = [
  '@cart', '@checkout', '@auth', '@membership', '@products', '@feeds', '@profile',
  '@messages', '@wallet', '@settings', '@analytics', '@campaigns', '@streaming',
  '@affiliate', '@referral', '@promotions', '@sessions', '@network-mock', '@payment',
  '@explore', '@follow', '@library', '@chart', '@message', '@like', '@comment', '@media', '@tip',
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
      issues.push('missing @AUT-E2E-* or @AUT-FV-* tag');
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

process.exit(exitCode);
