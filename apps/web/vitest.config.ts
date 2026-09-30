import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['node_modules/**', 'dist/**', 'coverage/**'],
    server: {
      deps: {
        // Monorepo dual-React hazard (see vite.config.ts's `dedupe`):
        // apps/mobile pins an exact react@18.2.0, forcing npm to hoist that
        // copy to the workspace root while apps/web's react@19 nests inside
        // apps/web/node_modules. Vitest externalizes node_modules deps by
        // default, so @tanstack/react-query/react-redux (hoisted to root)
        // would `require('react')` and get the root's 18.x copy instead of
        // this app's 19.x — inlining forces them through Vite's resolver,
        // which respects `resolve.dedupe` below.
        inline: [/@tanstack\/(react-)?query/, /react-redux/, /@reduxjs\/toolkit/],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      // Not gating on a coverage threshold yet — migration guide §4/§8
      // explicitly flags whether to enforce 100% from day one as a team
      // decision, not something to pick silently in a scaffold pass.
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/main.tsx', '**/*.types.ts'],
    },
  },
});
