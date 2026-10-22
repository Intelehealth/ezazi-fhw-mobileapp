/**
 * Shared ESLint config for the monorepo.
 *
 * Applies to `packages/*` (plain TypeScript libraries) and any future workspace
 * without its own config. `apps/mobile` declares `root: true` in its own
 * `.eslintrc.cjs` — including the architecture-boundary rules — so it is
 * governed there, not here.
 *
 * Deliberately NOT type-aware (no `parserOptions.project`): these packages are
 * linted for correctness/hygiene only, and type errors are already caught by
 * `turbo run typecheck`.
 */

// packages/* must never import an app. Shared so the clinical-rules override can re-list it:
// an override REPLACES a rule's options, it does not merge them.
const NO_APP_IMPORTS = {
  group: ['@ezazi/mobile', '@ezazi/mobile/*', '@ezazi/web', '@ezazi/web/*', '**/apps/**'],
  message:
    'Dependencies flow apps → packages, never the reverse (ARCHITECTURE.md). A shared package must not import an app — move the shared code into the package instead.',
};

/** @ezazi/clinical-rules stays pure so mobile and web can both run it (ARCHITECTURE.md). */
const CLINICAL_RULES_IMPORTS = [
  NO_APP_IMPORTS,
  {
    group: ['react', 'react-*', 'react/*', 'expo', 'expo-*', '@expo/*', '@react-native*/*'],
    message:
      'clinical-rules must not depend on a UI or native runtime - web and mobile both import it. Return plain data and let the app render it.',
  },
  {
    group: ['drizzle-orm', 'drizzle-orm/*', 'axios', 'axios/*', '@ezazi/api-client', '@ezazi/api-client/*'],
    message:
      'clinical-rules never reads or writes data - no database, no network. Return what should happen; the app stores it (DB_CONVENTIONS.md).',
  },
  {
    group: ['node:*', 'fs', 'fs/*', 'path', 'os', 'crypto', 'child_process', 'http', 'https', 'net', 'url', 'util', 'events', 'stream', 'buffer'],
    message: 'clinical-rules runs in Hermes and the browser too - no Node built-ins in its source.',
  },
  {
    group: ['@ezazi/config', '@ezazi/config/*'],
    message:
      'clinical-rules must not read client config - clinical meaning is identical for every client. Per-client validation ranges are range profiles inside this package (ARCHITECTURE_RULES §7a).',
  },
];

const CLINICAL_RULES_SYNTAX = [
  {
    selector: 'Literal[value=/^[0-9]{3,6}A{20,}$/]',
    message: 'No OpenMRS concept ids (e.g. 5090AAAA…) in clinical-rules. Use the concept constant name (conceptKey).',
  },
  {
    selector: 'TemplateElement[value.raw=/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-/]',
    message: 'No uuids in clinical-rules, including inside template strings.',
  },
  {
    selector: 'TSEnumDeclaration',
    message: 'Use a string union, not an enum - both apps transpile files one by one (package convention).',
  },
  {
    selector:
      'Literal[value=/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/]',
    message:
      'No uuids in clinical-rules. Name the concept or encounter type by its constant name; each app resolves uuids from its own constants (apps/mobile core/db/constants).',
  },
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: 'No clock in clinical-rules - take `now` (epoch ms) as a parameter so results are deterministic and testable.',
  },
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message: 'No clock in clinical-rules - `new Date()` reads the current time. Take `now` (epoch ms) as a parameter.',
  },
];

// Runtime-specific globals: the package must run unchanged in Hermes (mobile) and the browser (web).
const CLINICAL_RULES_GLOBALS = ['fetch', 'XMLHttpRequest', 'WebSocket', 'window', 'document', 'localStorage',
  'sessionStorage', 'navigator', 'performance', 'process'].map((name) => ({
  name,
  message: `clinical-rules is pure: no ${name}. Take what you need as a parameter.`,
}));

/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  env: { node: true, es2022: true },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  // ── Dependency direction (ARCHITECTURE.md — "apps → packages, never the reverse") ──
  // Scoped to packages/* on purpose: this config is also the fallback for any
  // workspace without its own, and the rule is meaningless for an app. Keeping
  // it in `overrides` means it can never fire on apps/web.
  overrides: [
    {
      files: ['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'],
      rules: {
        'no-restricted-imports': ['error', { patterns: [NO_APP_IMPORTS] }],
      },
    },
    {
      // Must come after the packages/* entry: later overrides win outright.
      files: ['packages/clinical-rules/src/**/*.ts'],
      excludedFiles: ['packages/clinical-rules/src/**/__tests__/**'],
      rules: {
        'no-restricted-imports': ['error', { patterns: CLINICAL_RULES_IMPORTS }],
        'no-restricted-syntax': ['error', ...CLINICAL_RULES_SYNTAX],
        'no-restricted-globals': ['error', ...CLINICAL_RULES_GLOBALS],
      },
    },
  ],

  ignorePatterns: [
    'node_modules/',
    'dist/',
    'coverage/',
    '*.tsbuildinfo',
    // apps/mobile owns its own config (root: true) — never lint it from here.
    'apps/mobile/**',
    '*.config.js',
    '*.config.cjs',
  ],
};
