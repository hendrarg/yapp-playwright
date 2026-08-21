// @ts-check
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";

/**
 * Lint rules for this repo encode the conventions that `.agents/rules/` already
 * states in prose. Anything a linter can enforce should not depend on an agent
 * remembering to re-read a markdown file.
 *
 * Deliberately narrow: this is a test-automation codebase, so the goal is to catch
 * convention drift (imports, locator placement, fixture entry point), not to impose
 * a general style regime on 20k lines of working tests.
 */
export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "test-results/**",
      "playwright-report/**",
      "blob-report/**",
      ".playwright-mcp/**",
      "docs/**",
      // Generated per-tool agent adapters — see scripts/sync-agent-config.mjs
      ".claude/**",
      ".cursor/**",
      ".opencode/**",
    ],
  },

  ...tseslint.configs.recommended,

  {
    plugins: { "@stylistic": stylistic },
    rules: {
      /*
       * `.agents/rules/code-style.md` → Imports: named imports stay on one line.
       * `never` forbids any line break inside import braces. The other node types are
       * left permissive on purpose — the rule is about imports, and multi-line option
       * objects / fixture destructuring are idiomatic Playwright, not drift.
       */
      "@stylistic/object-curly-newline": [
        "error",
        {
          ImportDeclaration: "never",
          ObjectExpression: { multiline: true, consistent: true },
          ObjectPattern: { multiline: true, consistent: true },
          ExportDeclaration: { multiline: true, consistent: true },
        },
      ],

      /* Deep relative imports must go through the tsconfig path aliases. */
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../../src/*", "../../../src/*", "../../config/*", "../../../config/*"],
              message: "Use a path alias (@pages/, @helpers/, @utils/, @test-data/, @config/, @fixtures/) instead of a deep relative import.",
            },
          ],
        },
      ],

      /*
       * Test data uses `any` in a few generic AI-payload paths; flagging every one
       * would drown the signal from the rules above. Explicit `any` stays a warning.
       */
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },

  {
    /* Spec-file-only rules from `.agents/rules/testing.md`. */
    files: ["tests/**/*.spec.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@playwright/test",
              message: "Spec files must import test/expect from '../test-base', not @playwright/test.",
            },
            {
              name: "@fixtures/base.fixture",
              message: "Spec files must import from '../test-base', not @fixtures/base.fixture directly.",
            },
          ],
          patterns: [
            {
              group: ["../../src/*", "../../../src/*"],
              message: "Use a path alias instead of a deep relative import.",
            },
          ],
        },
      ],

      /* Locators belong in page objects with smartLocator — never inline in a spec. */
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='locator']",
          message: "Locators must live in a page object using smartLocator, not in a spec file (.agents/rules/testing.md → Locators).",
        },
        {
          /*
           * Any `getBy*` in a spec, not just on `page`: locators built on a second tab
           * (`publicTab.getByRole(...)`) are just as much spec-level locators, and an
           * earlier `callee.object.name='page'` selector let six of them through.
           */
          selector: "CallExpression[callee.property.name=/^getBy(Role|Text|Label|Placeholder|TestId|AltText|Title)$/]",
          message: "Move this locator into a page object (.agents/rules/testing.md → Locators). For a second tab, construct the page object with that Page.",
        },
      ],
    },
  },

  {
    /* Node scripts are plain ESM utilities, not part of the Playwright graph. */
    files: ["scripts/**/*.mjs", "config/**/*.mjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
