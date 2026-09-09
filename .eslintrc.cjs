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
