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

    // Architecture layers, defined against the CURRENT FLAT src/ layout.
    // If/when src/ is restructured into core/ + features/, only this list
    // changes — the policies below stay meaningful.
    // NOTE: order matters — most specific first (first match wins).
    'boundaries/elements': [
      { type: 'services-api', pattern: 'src/services/api/**' },
      { type: 'screens', pattern: 'src/screens/**' },
      { type: 'components', pattern: 'src/components/**' },
      { type: 'navigation', pattern: 'src/navigation/**' },
      { type: 'stores', pattern: 'src/stores/**' },
      { type: 'db', pattern: 'src/db/**' },
      { type: 'services', pattern: 'src/services/**' },
      { type: 'context', pattern: 'src/context/**' },
      { type: 'hooks', pattern: 'src/hooks/**' },
      { type: 'config', pattern: 'src/config/**' },
      { type: 'i18n', pattern: 'src/i18n/**' },
      { type: 'utils', pattern: 'src/utils/**' },
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
            // Presentation must never touch the data layer directly.
            from: [{ element: { type: ['screens', 'components'] } }],
            disallow: [{ to: { element: { type: ['db', 'services-api'] } } }],
            message:
              'Presentation (screens/components) must not import the data layer (src/db or src/services/api) directly — go through a store or a repository. See CLAUDE.md.',
          },
          {
            // src/screens is a leaf: only navigation may pull a screen in.
            from: [
              {
                element: {
                  type: ['components', 'stores', 'db', 'services', 'services-api', 'hooks', 'utils', 'context'],
                },
              },
            ],
            disallow: [{ to: { element: { type: ['screens'] } } }],
            message: 'src/screens is a leaf layer — only src/navigation may import a screen.',
          },
          {
            // Data and service layers must not depend on UI.
            from: [{ element: { type: ['db', 'services', 'services-api'] } }],
            disallow: [{ to: { element: { type: ['components', 'screens', 'navigation'] } } }],
            message: 'The data/service layers must not depend on UI (components, screens, navigation).',
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
