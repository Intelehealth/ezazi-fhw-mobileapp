# eZAZI Monorepo — Architecture Overview

`ezazi-monorepo` — the Intelehealth eZAZI / eLCG FHW platform: an **Expo/React Native** mobile app for frontline health workers and a **React/Vite** web app for doctors, over shared packages.

## Layout

```
ezazi-monorepo/
├── apps/
│   ├── mobile/   @ezazi/mobile   — FHW app (Expo/React Native)   → see apps/mobile/*.md
│   └── web/      @ezazi/web      — doctor webapp (React/Vite)     → rules TBD
├── packages/
│   ├── api-client/  @ezazi/api-client  — HTTP client, interceptors, ApiResult, endpoints
│   ├── clinical-rules/ @ezazi/clinical-rules — pure clinical rules: cards, SOS, fields, ranges, validation; no DB, no uuids
│   ├── config/      @ezazi/config      — multi-tenant client registry + env contracts
│   └── types/       @ezazi/types       — shared domain types (patient, visit, obs, …)
├── turbo.json            — Turborepo task graph (build/lint/typecheck/test)
├── tsconfig.base.json    — shared strict TS config (all workspaces extend it)
└── package.json          — npm workspaces (apps/*, packages/*), engines.node ">=20 <21"
```

## Tooling

- **npm workspaces** (`npm@10.8.2`) + **Turborepo**. Run from root: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` (all `turbo run …`); `npm run mobile` / `npm run web` to start an app.
- **Node 20** (`>=20 <21`). *(Note: the mobile SDK 57 target works on Node 20.19.4+; RN 0.87 / Expo SDK 58 will later require Node 22 — the `engines` cap will need lifting then.)*
- **CI:** `.github/workflows/mobile-ci.yml` and `web-ci.yml` run typecheck + lint + test per workspace on PRs.

## Rules that span the monorepo

- **Dependencies flow apps → packages, never the reverse.** A `packages/*` must not import from an `apps/*`.
<!-- Superseded 2026-10-15 (Kaveri): adds `@ezazi/clinical-rules`, the new shared clinical rules package (commit 3083a9e), so mobile and web use one copy of the rules. Original text kept for reference:
- **Shared contracts live in `packages/*`.** The mobile and web apps agree on the API contract (`@ezazi/api-client`), client config (`@ezazi/config`), and domain types (`@ezazi/types`) by sharing them — so they can't drift. This keeps the **white-label boundary** (clinical semantics identical across eZAZI/eLCG) consistent across *both* apps.
-->
- **Shared contracts live in `packages/*`.** The mobile and web apps agree on the API contract (`@ezazi/api-client`), clinical rules (`@ezazi/clinical-rules`), client config (`@ezazi/config`), and domain types (`@ezazi/types`) by sharing them — so they can't drift. This keeps the **white-label boundary** (clinical semantics identical across eZAZI/eLCG) consistent across *both* apps.
- **Clinical logic lives only in `@ezazi/clinical-rules`.** Card schedule, partogram fields, validation ranges and (later) alerts are written once there, and both apps import them from the package root — never re-implemented in an app. The package is pure: no database, no network, no React/React Native/DOM, no uuid literals, no clock (callers pass `now`), and it never reads `@ezazi/config`. Root eslint enforces this.
- **Per-client validation ranges are the one clinical value that may differ** — as named range profiles inside `@ezazi/clinical-rules`, never in client config. Everything else clinical is identical for every client. Rules: `apps/mobile/ARCHITECTURE_RULES.md` §7a.

## Where the detailed rules live

| Doc | Scope |
|---|---|
| [`apps/mobile/CLAUDE.md`](apps/mobile/CLAUDE.md) | **Start here for mobile work** — auto-loaded router: locked stack, silent-failure tripwires, and which doc to read for what |
| [`apps/mobile/ARCHITECTURE_RULES.md`](apps/mobile/ARCHITECTURE_RULES.md) | Mobile stack: SDK 57 versions, component decisions, do-not rules |
| [`apps/mobile/MOBILE_STACK.md`](apps/mobile/MOBILE_STACK.md) | Mobile folder structure (feature-modular) + rationale |
| `apps/web/` | Web app architecture rules — **TBD** |
