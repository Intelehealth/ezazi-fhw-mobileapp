/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'boundaries'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  settings: {
    react: { version: 'detect' },

    // Resolve the `@/*` -> `src/*` alias (and relative imports) so boundary
    // rules see real file paths — a plain string-pattern rule would miss
    // bypasses like `../../db`.
    'import/resolver': {
      typescript: { project: './tsconfig.json' },
      node: { extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'] },
    },

    // Architecture layers for the feature-modular layout (restructure Phase 4).
    // NOTE: order matters - first match wins, so specific before general.
    'boundaries/elements': [
      // Features. `capture: ['feature']` binds the * to a name, which the
      // isolation policy below compares against - that is what makes
      // "a feature may import itself but no sibling" expressible at all.
      { type: 'feature-screens', pattern: 'src/features/*/screens/**', capture: ['feature'] },
      { type: 'feature-components', pattern: 'src/features/*/components/**', capture: ['feature'] },
      { type: 'feature-stores', pattern: 'src/features/*/stores/**', capture: ['feature'] },
      { type: 'feature-data', pattern: 'src/features/*/data/**', capture: ['feature'] },
      { type: 'feature-domain', pattern: 'src/features/*/domain/**', capture: ['feature'] },
      // Core spine.
      { type: 'core-session', pattern: 'src/core/session/**' },
      { type: 'core-api', pattern: 'src/core/api/**' },
      { type: 'core-db', pattern: 'src/core/db/**' },
      { type: 'core-services', pattern: 'src/core/services/**' },
      { type: 'core-config', pattern: 'src/core/config/**' },
      { type: 'core-ui', pattern: 'src/core/ui/**' },
      { type: 'core-i18n', pattern: 'src/core/i18n/**' },
      { type: 'core-utils', pattern: 'src/core/utils/**' },
      { type: 'navigation', pattern: 'src/navigation/**' },
      { type: 'types', pattern: 'src/types/**' },
    ],
  },
  env: { node: true, es2022: true, jest: true },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    // RN static assets are loaded with require('./img.png') by design
    '@typescript-eslint/no-var-requires': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',

    // ── Rejected dependencies (ARCHITECTURE_RULES §9 — "DO NOT re-propose") ──
    // These four were evaluated and rejected. WatermelonDB in particular was
    // fully removed in the SDK 57 migration (no New-Architecture support) and
    // must not come back. Prose in a doc stops nobody; this does.
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@nozbe/watermelondb', '@nozbe/watermelondb/*'],
            message:
              'WatermelonDB is rejected and was removed in the SDK 57 migration — it has no New-Arch support (ARCHITECTURE_RULES §9). Use expo-sqlite + Drizzle.',
          },
          {
            group: ['redux', 'redux/*', '@reduxjs/toolkit', '@reduxjs/toolkit/*', 'react-redux', 'react-redux/*'],
            message:
              "Redux/RTK is rejected (ARCHITECTURE_RULES §9) — its server-cache model fights the local-DB-first design. Session/UI state goes in zustand; clinical data lives in the DB.",
          },
          {
            group: ['realm', 'realm/*', '@realm/*', '@powersync/*'],
            message:
              'Realm and PowerSync are rejected (ARCHITECTURE_RULES §9). The offline store is expo-sqlite + Drizzle; sync is our own single-seam engine.',
          },
        ],
      },
    ],

    // ── Architecture boundaries (ARCHITECTURE_RULES §4 · MOBILE_STACK §3) ──
    // This rule is the enforcement that lets the docs stop describing which
    // layer may import which. `default: 'allow'` keeps it to the high-value
    // policies instead of enumerating every legal pairing.
    'boundaries/dependencies': [
      'error',
      {
        default: 'allow',
        policies: [
          {
            // Feature isolation - the rule that was impossible on the flat layout.
            // A feature may import its OWN folder; never a sibling's internals.
            from: { element: { types: { anyOf: ['feature-screens', 'feature-components', 'feature-stores', 'feature-data', 'feature-domain'] } } },
            disallow: {
              to: { element: { types: { anyOf: ['feature-screens', 'feature-components', 'feature-stores', 'feature-data', 'feature-domain'] } } },
            },
            message:
              'Feature isolation: {{from.feature}} must not import {{target.feature}} internals. Share via core/* or @ezazi/*, never feature-to-feature. See MOBILE_STACK section 6.',
          },
          {
            // ...but a feature may import its OWN folder. This rule follows the
            // broad disallow above on purpose - the plugin is last-write-wins,
            // so the narrower same-feature carve-out re-permits it.
            from: { element: { types: { anyOf: ['feature-screens', 'feature-components', 'feature-stores', 'feature-data', 'feature-domain'] } } },
            allow: {
              to: { element: { types: { anyOf: ['feature-screens', 'feature-components', 'feature-stores', 'feature-data', 'feature-domain'] }, feature: '{{from.feature}}' } },
            },
          },
          {
            // Presentation must never touch the data layer directly.
            from: { element: { types: { anyOf: ['feature-screens', 'feature-components'] } } },
            disallow: { to: { element: { types: { anyOf: ['core-db', 'core-api', 'feature-data'] } } } },
            message:
              'Presentation (screens/components) must not import the data layer (core/db, core/api, features/*/data) directly - go through a store or a repository. See CLAUDE.md.',
          },
          {
            // Screens are leaves: only navigation may pull one in.
            from: {
              element: {
                types: {
                  anyOf: [
                    'feature-components', 'feature-stores', 'feature-data', 'feature-domain',
                    'core-api', 'core-db', 'core-services', 'core-config', 'core-session', 'core-ui', 'core-i18n', 'core-utils',
                  ],
                },
              },
            },
            disallow: { to: { element: { type: 'feature-screens' } } },
            message: 'Screens are a leaf layer - only src/navigation may import a screen.',
          },
          {
            // Data and service layers must not depend on UI.
            from: { element: { types: { anyOf: ['core-db', 'core-api', 'core-services', 'feature-data'] } } },
            disallow: {
              to: { element: { types: { anyOf: ['core-ui', 'feature-screens', 'feature-components', 'navigation'] } } },
            },
            message: 'The data/service layers must not depend on UI (core/ui, feature screens/components, navigation).',
          },
        ],
      },
    ],
  },
  ignorePatterns: [
    'node_modules/',
    '.expo/',
    'dist/',
    'web-build/',
    'android/',
    'ios/',
    'drizzle/',
    '*.config.js',
    '*.config.cjs',
    'drizzle.config.ts',
  ],
};
