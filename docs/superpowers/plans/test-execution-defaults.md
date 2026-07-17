# Test Execution Defaults Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make local and CI Playwright execution Chromium-only, single-worker by default, and consistent with the repository's E2E-only test surface.

**Architecture:** `playwright.config.ts` owns stable execution defaults, package scripts expose the three supported local lanes, and GitHub Actions reuses the smoke lane. Standalone API project guidance is deleted while `src/helpers/api/` remains available to browser tests.

**Tech Stack:** Playwright, TypeScript, npm scripts, GitHub Actions, Markdown

## Global Constraints

- Keep only the Chromium Playwright project.
- Do not add scheduled or cross-browser execution.
- Default to one worker; preserve `PW_WORKERS` as an explicit override.
- Run one retry in CI and zero retries locally.
- Keep `src/helpers/api/` and its browser-test consumers.
- Do not add dependencies or a configuration-test framework.
- Keep required CI URLs, secrets, artifact upload, and the 60-minute timeout.
- Historical Superpowers plans remain unchanged.

---

### Task 1: Configure Chromium-only execution lanes

**Files:**
- Modify: `playwright.config.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `PW_HEADLESS`, `PLAYWRIGHT_HEADLESS`, `PW_WORKERS`, and `CI`
- Produces: `npm test`, `npm run test:smoke`, and `npm run test:regression`

- [ ] **Step 1: Run configuration checks that fail against the current behavior**

Run:

```powershell
node -e "const s=require('./package.json').scripts; if(s.test==='playwright test --project=chromium'&&s['test:smoke']&&s['test:regression']) process.exit(0); process.exit(1)"
npx playwright test --list
```

Expected: the Node assertion exits `1`; Playwright lists 117 executions across Chromium, Firefox, and WebKit.

- [ ] **Step 2: Apply the minimum configuration changes**

In `playwright.config.ts`:

- move `dotenv.config({ path: path.resolve(__dirname, '.env') })` before the headless and worker calculations;
- calculate workers with `Number(process.env.PW_WORKERS ?? 1)`;
- change CI retries from `2` to `1`;
- retain only the Chromium project;
- keep headless, reporter, trace, viewport, and launch settings unchanged.

In `package.json`, set the scripts exactly to:

```json
"test": "playwright test --project=chromium",
"test:smoke": "playwright test --project=chromium --grep @smoke",
"test:regression": "playwright test --project=chromium --grep @regression"
```

Keep `test:automation-context` and `automation:context` unchanged.

- [ ] **Step 3: Run green discovery checks**

Run:

```powershell
node -e "const s=require('./package.json').scripts; if(s.test!=='playwright test --project=chromium'||!s['test:smoke']||!s['test:regression']||s['test:cross-browser']) process.exit(1)"
npm test -- --list
npm run test:smoke -- --list
npm run test:regression -- --list
```

Expected: the assertion exits `0`; default discovery lists 39 Chromium tests, smoke lists 22, and regression lists 19.

### Task 2: Simplify CI to Chromium smoke

**Files:**
- Modify: `.github/workflows/playwright.yml`

**Interfaces:**
- Consumes: the `test:smoke` package script from Task 1
- Produces: one push/pull-request CI lane with Chromium, one worker, headless execution, and one retry

- [ ] **Step 1: Prove the old scheduled/cross-browser branches exist**

Run:

```powershell
rg -n "schedule|GITHUB_EVENT_NAME|playwright install --with-deps$|npx playwright test$" .github/workflows/playwright.yml
```

Expected: matches show the scheduled trigger and conditional all-browser execution.

- [ ] **Step 2: Replace conditional CI execution**

Use `apply_patch` to:

- remove the `schedule` trigger;
- replace the conditional browser installation with `npx playwright install --with-deps chromium`;
- replace the conditional test command with `npm run test:smoke`;
- rename the skip step to `Skip Playwright tests`;
- preserve all environment values, secrets, type-checking, artifact upload, retention, and timeout.

- [ ] **Step 3: Verify the workflow text**

Run:

```powershell
$yaml = Get-Content -Raw .github/workflows/playwright.yml
if ($yaml -match 'schedule|GITHUB_EVENT_NAME') { exit 1 }
if ($yaml -notmatch 'playwright install --with-deps chromium') { exit 1 }
if ($yaml -notmatch 'npm run test:smoke') { exit 1 }
if ($yaml -notmatch '!cancelled\(\)') { exit 1 }
```

Expected: exit code `0`.

### Task 3: Remove stale standalone API guidance

**Files:**
- Delete: `.agents/commands/test-api.md`
- Delete: `.agents/skills/api-testing/SKILL.md`
- Modify: `AGENTS.md`
- Modify: `.env.example`
- Modify: `.agents/commands/test-grep.md`
- Modify: `.agents/rules/code-style.md`
- Modify: `.agents/rules/testing.md`
- Modify: `.agents/rules/ci.md`
- Modify: `.agents/skills/registry.md`
- Modify: `.agents/skills/add-test-spec/SKILL.md`
- Modify: `.agents/skills/iterative-e2e-testing/SKILL.md`
- Modify: `.agents/skills/network-mocking/SKILL.md`
- Modify: `.agents/skills/ci-maintenance/SKILL.md`

**Interfaces:**
- Consumes: the browser-only test architecture and `src/helpers/api/`
- Produces: active instructions that generate and run browser automation only

- [ ] **Step 1: Record the failing stale-reference audit**

Run:

```powershell
rg -n -- "--project=api|tests/api|api\.fixtures|api-testing|API-only" AGENTS.md .agents
```

Expected: matches identify every active stale API-test reference.

- [ ] **Step 2: Delete standalone API entry points**

Use `apply_patch` to delete `.agents/commands/test-api.md` and `.agents/skills/api-testing/SKILL.md`.

- [ ] **Step 3: Update repository rules and commands**

Use `apply_patch` to:

- describe the repository as Playwright E2E tests in `AGENTS.md`;
- remove the API project command, `tests/api/` architecture entry, and API output branch;
- update `YAPP_TEST_ACCESS_TOKEN_2` notes in `AGENTS.md`, `.agents/rules/ci.md`, and `.env.example` to say it supports creator-post seeding for E2E tests;
- remove standalone API fixture sections from testing and code-style rules;
- change CI validation to `npx playwright test --project=chromium --list`;
- remove the API block from `.agents/commands/test-grep.md`.

- [ ] **Step 4: Update active skills**

Use `apply_patch` to:

- remove `api-testing` from the registry;
- remove API fixture/spec branches from `add-test-spec`;
- remove the API round and API ID references from `iterative-e2e-testing`, and replace its stale local-Markdown wording with Automation Mapping context;
- remove the `api-testing` related-skill link from `network-mocking`;
- remove API-project checks from `ci-maintenance` and use Chromium discovery for verification.

- [ ] **Step 5: Verify stale references are gone and helpers remain used**

Run:

```powershell
$stale = rg -n -- "--project=api|tests/api|api\.fixtures|api-testing|API-only" AGENTS.md .agents
if ($LASTEXITCODE -ne 1) { $stale; exit 1 }
rg -n "@helpers/api" tests
```

Expected: the stale audit returns no matches; helper imports remain in `tests/buyer/feeds.spec.ts` and `tests/buyer/profile.spec.ts`.

### Task 4: Final verification and commit

**Files:**
- Verify: all files changed in Tasks 1-3

**Interfaces:**
- Consumes: Chromium-only config, npm lanes, simplified CI, and browser-only instructions
- Produces: a verified commit on `main`

- [ ] **Step 1: Run static and discovery verification**

Run:

```powershell
npx tsc --noEmit
npm test -- --list
npm run test:smoke -- --list
npm run test:regression -- --list
```

Expected: TypeScript exits `0`; discovery counts are 39 default, 22 smoke, and 19 regression.

- [ ] **Step 2: Verify CI-mode config loads**

Run:

```powershell
$env:CI = 'true'
npm test -- --list
Remove-Item Env:CI
```

Expected: Chromium-only discovery succeeds with 39 tests.

- [ ] **Step 3: Review patch integrity**

Run:

```powershell
git diff --check
git diff -- docs/superpowers/plans/e2e-only-api-helpers.md
git status --short
git diff --stat
git diff
```

Expected: no whitespace errors, no historical-plan changes, and only approved configuration/guidance cleanup files are modified.

- [ ] **Step 4: Commit**

Run:

```powershell
git add -A -- playwright.config.ts package.json .github AGENTS.md .env.example .agents docs/superpowers/plans/test-execution-defaults.md
git commit -m "chore: simplify test execution defaults"
```

Expected: commit succeeds and the working tree is clean.
