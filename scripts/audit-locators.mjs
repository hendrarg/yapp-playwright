import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PAGES_DIR = path.join(ROOT, 'src', 'pages');
const TESTS_DIR = path.join(ROOT, 'tests');

/**
 * The Yapp app ships **zero** `data-testid` attributes (verified in the browser), so a
 * hand-authored id like `#set-inactive` is the closest thing it offers to a test hook —
 * it is not fragile the way a Tailwind class is. Two id shapes ARE fragile and stay
 * flagged: Radix auto-generated ids, which change on every render
 * (`#radix-_r_0_`, `#_r_1a_-form-item`), and anything class-based.
 */
const STABLE_ID_SELECTOR = /page\.locator\s*\(\s*['"`]#(?!radix-|_r_)[a-z][a-z0-9-]*['"`]\s*\)/;

const FRAGILE_PATTERNS = [
  {
    name: 'css-locator',
    regex: /page\.locator\s*\(\s*['"`][.#]/,
    // A lone stable id is an acceptable strategy; a class selector never is.
    allow: (line) => STABLE_ID_SELECTOR.test(line),
  },
  { name: 'xpath-locator', regex: /locator\s*\(\s*['"`]xpath=/i },
  { name: 'raw-xpath-string', regex: /['"`]xpath=\.\./ },
];

function walkTsFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkTsFiles(full));
    else if (entry.name.endsWith('.ts')) results.push(full);
  }
  return results;
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function auditFile(file, allowedInTests = false) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const findings = [];

  // Comment lines are prose: a doc comment that explains which XPath was replaced must
  // not be reported as if it were the locator itself.
  const isComment = (line) => /^\s*(\/\/|\/\*|\*)/.test(line);

  for (const { name, regex, allow } of FRAGILE_PATTERNS) {
    lines.forEach((line, index) => {
      if (isComment(line)) return;
      if (!regex.test(line)) return;
      if (allow && allow(line)) return;
      findings.push({ kind: name, line: index + 1, text: line.trim() });
    });
  }

  // Require an actual call, not just the identifier: a dead `import { smartLocator }`
  // used to satisfy this check, which let three page objects pass without using it.
  const usesSmartLocator = /\bsmartLocator\s*\(/.test(content) || /\blocatorChain\s*\(/.test(content);
  if (!usesSmartLocator && !allowedInTests && rel(file) !== 'src/pages/shared/locators.ts') {
    const hasLocators = /getBy(Role|Text|Label|Placeholder|TestId)|page\.locator/.test(content);
    if (hasLocators && !rel(file).includes('auth/LoginPage')) {
      findings.push({
        kind: 'no-smart-locator',
        line: 1,
        text: 'Page object defines locators but never calls smartLocator/locatorChain',
      });
    }
  }

  return findings;
}

let exitCode = 0;
const pageFiles = walkTsFiles(PAGES_DIR);
const specFiles = walkTsFiles(TESTS_DIR).filter((f) => f.endsWith('.spec.ts'));

console.log('Locator audit\n');

for (const file of pageFiles) {
  const findings = auditFile(file);
  if (findings.length === 0) continue;
  exitCode = 1;
  console.log(`${rel(file)}`);
  for (const f of findings) {
    console.log(`  [${f.kind}] L${f.line}: ${f.text}`);
  }
  console.log('');
}

for (const file of specFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const specLocatorPatterns = [
    /page\.(getBy|locator)\(/,
    /\.getBy(Role|Text|Label|Placeholder|TestId)\(/,
  ];
  if (specLocatorPatterns.some((re) => re.test(content))) {
    exitCode = 1;
    console.log(`${rel(file)}`);
    console.log('  [locator-in-spec] Spec file contains inline locators — move to page objects with smartLocator');
    console.log('');
  }
}

if (exitCode === 0) {
  console.log('No fragile locator findings.');
} else {
  console.log('Audit finished with findings. Fragile locators should be upgraded to smartLocator when touched.');
}

process.exit(exitCode);
