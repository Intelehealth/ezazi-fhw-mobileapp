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
 *
 * @type {import("eslint").Linter.Config}
 */
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
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@ezazi/mobile', '@ezazi/mobile/*', '@ezazi/web', '@ezazi/web/*', '**/apps/**'],
                message:
                  'Dependencies flow apps → packages, never the reverse (ARCHITECTURE.md). A shared package must not import an app — move the shared code into the package instead.',
              },
            ],
          },
        ],
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
