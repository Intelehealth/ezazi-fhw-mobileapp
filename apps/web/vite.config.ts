import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Mirrors intelehealth-hw-webapp-react's vite.config.ts dev proxy shape
  // ('/portal-api' rewritten to the portal's '/api'). TODO(EZAZI_PORTAL_PROXY):
  // that reference proxies to a hardcoded intelehealth.org dev host — eZAZI's
  // own dev portal host isn't confirmed yet, so this reads
  // VITE_PORTAL_API_PROXY_TARGET (see .env.example) and the route is simply
  // omitted below when it's unset, rather than pointing at a fake
  // dev.example.org host that would silently fail every call through it.
  const proxy: Record<
    string,
    {
      target: string;
      changeOrigin: true;
      secure: false;
      rewrite: (path: string) => string;
    }
  > = {};
  if (env.VITE_PORTAL_API_PROXY_TARGET) {
    proxy['/portal-api'] = {
      target: env.VITE_PORTAL_API_PROXY_TARGET,
      changeOrigin: true,
      secure: false,
      rewrite: (path: string) => path.replace(/^\/portal-api/, '/api'),
    };
  }
  // See src/services/http.ts: openMrsHttpClient's baseURL switches to this
  // same-origin '/openmrs-api' path in dev mode so the browser never makes
  // the cross-origin request directly (that gets CORS-preflight-blocked —
  // see that file's own note). Omitted, same as above, when VITE_OPENMRS_URL
  // isn't set — env.ts's OPENMRS_URL has no placeholder fallback either.
  if (env.VITE_OPENMRS_URL) {
    proxy['/openmrs-api'] = {
      target: env.VITE_OPENMRS_URL,
      changeOrigin: true,
      secure: false,
      rewrite: (path: string) => path.replace(/^\/openmrs-api/, ''),
    };
  }

  // Matches src/config/env.ts's BASE_PATH: the sub-path this app is served
  // under behind a reverse proxy (e.g. VITE_BASE_PATH=/doctor-portal ->
  // base '/doctor-portal/'), defaulting to root when unset.
  const basePath = env.VITE_BASE_PATH
    ? `${env.VITE_BASE_PATH.replace(/\/$/, '')}/`
    : '/';

  return {
    base: basePath,
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
      proxy: mode === 'development' ? proxy : undefined,
    },
  };
});
