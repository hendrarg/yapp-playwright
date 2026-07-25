import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PAGES_DIR = path.join(ROOT, 'src', 'pages');
const TESTS_DIR = path.join(ROOT, 'tests');

const FRAGILE_PATTERNS = [
  { name: 'css-locator', regex: /page\.locator\s*\(\s*['"`][.#]/ },
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

  for (const { name, regex } of FRAGILE_PATTERNS) {
    lines.forEach((line, index) => {
      if (regex.test(line)) {
        findings.push({ kind: name, line: index + 1, text: line.trim() });
      }
    });
  }

  if (!content.includes('smartLocator') && !allowedInTests && rel(file) !== 'src/pages/shared/locators.ts') {
    const hasLocators = /getBy(Role|Text|Label|Placeholder|TestId)|page\.locator|smartLocator/.test(content);
    if (hasLocators && !rel(file).includes('auth/LoginPage')) {
      findings.push({
        kind: 'no-smart-locator-import',
        line: 1,
        text: 'Page object defines locators but does not import or use smartLocator',
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
