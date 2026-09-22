import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// Deliberately NOT importing @ezazi/config here (unlike src/config/env.ts,
// which imports it fine): vite.config.ts loads in Vite's Node-context config
// loader, which externalizes node_modules imports by default — including
// workspace packages resolved through a node_modules symlink — and can't
// natively load @ezazi/config's raw .ts entry point (its package.json
// "main" points at src/index.ts, not a compiled dist/ file) the way the
// browser-side app bundle can. The placeholder below matches
// packages/config/src/servers.ts's DEFAULT_SERVERS.development.portalUrl.
const FALLBACK_DEV_PORTAL_URL = 'https://dev.example.org/portal-api';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
      // Avoid duplicate-React issues when a shared package and apps/web both
      // resolve react/react-dom across the workspace.
      dedupe: ['react', 'react-dom'],
    },
    server: {
      port: 4200,
      proxy:
        mode === 'development'
          ? {
              // Mirrors intelehealth-hw-webapp-react's vite.config.ts dev
              // proxy shape ('/portal-api' rewritten to the portal's '/api').
              // TODO(EZAZI_PORTAL_PROXY): that reference proxies to a
              // hardcoded intelehealth.org dev host — eZAZI's own dev portal
              // host isn't confirmed yet, so this reads
              // VITE_PORTAL_API_PROXY_TARGET (see .env.example) and falls
              // back to @ezazi/config's placeholder dev URL so `npm run dev`
              // doesn't error on a missing env var.
              '/portal-api': {
                target: env.VITE_PORTAL_API_PROXY_TARGET || FALLBACK_DEV_PORTAL_URL,
                changeOrigin: true,
                secure: false,
                rewrite: (path: string) => path.replace(/^\/portal-api/, '/api'),
              },
            }
          : undefined,
    },
  };
});
