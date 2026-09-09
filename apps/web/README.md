# apps/web — eZAZI doctor webapp

React 19 + TypeScript-strict + Vite. Scaffolded per
`ezazi-doctor-webapp-migration-guide.md` (repo root) — foundational
architecture only (bootstrap, providers, routing skeleton, shared-package
wiring) plus one end-to-end example module (auth/login) proving the
pattern. See that guide's §7 for what gets migrated next, module by module.

## Scripts

- `npm run dev` — start the Vite dev server.
- `npm run build` — typecheck + production build.
- `npm run typecheck` / `npm run lint` / `npm run test` / `npm run test:cov`.

## Shared packages

- `@ezazi/api-client` — `createApiClient`, `ApiError`/`ApiResult` — see
  `src/services/http.ts`.
- `@ezazi/config` — `DEFAULT_SERVERS`/`AppEnvironment` — see
  `src/config/env.ts`. `ClientBrandConfig`/`buildClientRegistry` (per-client
  branding/theme) aren't wired up yet — no client-selection/branding module
  exists in this pass.
- `@ezazi/types` — `AppConfig` — see `src/reducers/config.reducer.ts`.
