# Mobile Stack — Folder Structure & Architecture (`@ezazi/mobile`)

> **Read this when:** adding or moving a file, creating a new feature, or deciding where code belongs. **Do not read it to answer "may X import Y" — that is enforced by eslint; run `npm run lint`.** Always-loaded summary: [`CLAUDE.md`](CLAUDE.md).
>
> Companion to [`ARCHITECTURE_RULES.md`](ARCHITECTURE_RULES.md) (stack + versions) and the monorepo overview [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md). Defines **how `apps/mobile` is organized** and **why**. Pattern is **LOCKED**. (The sync engine is **ours to hand-roll** — the single-seam rule is locked; only its implementation is outstanding.)
>
> **Current state:** `apps/mobile/src` is still **flat** (`components/ config/ db/ screens/ services/ stores/ …`) from the pre-monorepo app. The **feature-modular** target below is the goal; adopting it is part of the remaining build-out (§7). *(The SDK 51→57 migration is complete and deliberately did not restructure `src`.)*

## 1. Architecture pattern

**Feature-modular + layered** (pragmatic MVVM / Clean-lite) inside `apps/mobile`, on top of **shared monorepo packages**. Organize by feature; layer inside each feature. Cross-app contracts (HTTP client, client config, domain types) live in `packages/*` and are shared with the doctor **web** app — not re-implemented per app.

## 2. Folder structure (in the monorepo) — 🗺️ ROADMAP, not current

> ⚠️ **`src/` is flat today** (`components/ config/ context/ db/ hooks/ i18n/ navigation/ screens/ services/ stores/ types/ utils/`). The tree below is the **target**: `core/` and `features/` do **not** exist yet. Never write an import against these paths without checking the real folder first.

```
ezazi-monorepo/
├── packages/                         # shared across apps (mobile + web)
│   ├── api-client/  (@ezazi/api-client)  # axios client, interceptors, ApiResult, endpoints
│   ├── config/      (@ezazi/config)      # multi-tenant client registry + env contracts
│   └── types/       (@ezazi/types)       # shared domain types (patient, visit, obs, …)
│
├── apps/
│   ├── web/                          # doctor webapp (React/Vite) — separate rules TBD
│   └── mobile/   (@ezazi/mobile)      # THIS app
│       ├── app.config.js · eas.json · babel/metro/jest.config.js · App.tsx
│       └── src/
│           ├── core/                 # mobile-only shared spine
│           │   ├── db/               #   expo-sqlite + Drizzle: schema, migrations, live queries
│           │   │   ├── schema/ · migrations/
│           │   │   └── sync/         #   the SINGLE sync engine (owns EMR-Middleware pull/push)
│           │   ├── services/         #   long-lived singletons via hooks:
│           │   │   ├── livekit/ (useCall) · socket/ (useChat) · fcm/ · firebase/
│           │   ├── ui/               #   RN design-system primitives (AppButton, …)
│           │   ├── i18n/ · utils/    #   locales, logger, calendar (BS/AD)
│           │   └── api/              #   thin mobile adapter over @ezazi/api-client (auth token, storage)
│           ├── features/             # one folder per feature; MIRRORS legacy modules (§8)
│           │   ├── auth/
│           │   │   ├── screens/ components/ stores/ data/ domain/
│           │   ├── patient/ · visit/ · labour-care-guide/ · postpartum/ · prescription/ · teleconsult/
│           └── navigation/           # auth-gated root + per-feature navigators
```

**What moved to shared packages:** the pre-monorepo `core/api`, `core/config`, and shared types are now `@ezazi/api-client`, `@ezazi/config`, `@ezazi/types`. `apps/mobile/src/core/api` is now just a **thin adapter** (inject the auth token from secure storage, wire the mobile error/Result handling) over `@ezazi/api-client`.

**What stays mobile-only:** `db` (offline SQLite/Drizzle — the web app is online), `services` (native RN: LiveKit, socket, FCM, Firebase), `ui` (RN primitives), `navigation`, and all `features/*`.

**Rule of thumb:** a feature imports from `apps/mobile/src/core/*`, the `@ezazi/*` packages, and its own folder — **never** another feature's internals (§6). Apps depend on packages; packages never depend on apps.

## 3. Layer responsibilities

| Layer | Where | Does | Must NOT |
|---|---|---|---|
| Presentation | `features/*/screens`, `components` | Render, dispatch to stores/hooks | Contain business logic, DB, or network |
| State | `features/*/stores` + DB live queries | Session/UI state; expose domain data | Duplicate DB rows |
| Domain | `features/*/domain` + `@ezazi/types` | Entities, zod schemas, real logic (partograph, risk scores, LCG) | Grow thick |
| Data | `features/*/data`, `core/db`, `@ezazi/api-client` | Repositories over DB ⊕ API; the sync engine | Let features bypass it |
| Services | `core/services` | Long-lived singletons via hooks | Live in the component tree |

**Flow:** Screen → Zustand store / Drizzle `useLiveQuery` (ViewModel) → repository in `features/*/data` → `core/db` and/or `@ezazi/api-client` → the sync engine reconciles in the background. Navigation is reactive off auth state.

## 4. State taxonomy (get this right on day one)

| State kind | Home | Rule |
|---|---|---|
| Clinical / domain data | **Drizzle live query over expo-sqlite** | Single source of truth; re-render from the DB. |
| Session / auth / ephemeral UI | **Zustand** | Never duplicate DB rows. |
| Online-only reads (not persisted) | **TanStack Query** (optional) | Only when not stored in the DB. |
| Form state | **react-hook-form + zod** | Per-form, never global, never `useState`. |

## 5. Rationale (why these choices)

- **Why feature-based (not layer-first)?** ~100+ screens across distinct clinical modules; grouping by feature keeps modules self-contained, mirrors the legacy package layout for a 1:1 port (§8), and lets the team work modules in parallel.
- **Why Zustand (not Redux/RTK, not Context)?** Lightest session/UI state — tiny store + hooks, no boilerplate, pure JS (New-Arch-agnostic). Redux/RTK's server-cache model would fight the **local-DB-first** design (Drizzle is already the reactive source of truth → a second cache = two sources of truth). Context re-renders poorly for hot state. Zustand is the sweet spot.
- **Why the DB is the source of truth?** Clinical data must survive offline/reload/background sync; Drizzle `useLiveQuery` gives reactive reads from SQLite, so no mirroring into Zustand (the legacy God-Activity bug).
- **Why shared packages (`@ezazi/*`)?** The doctor web app and the FHW mobile app must agree on the API contract, client config, and domain types. Sharing them as packages guarantees they can't drift — and keeps the white-label boundary consistent across *both* apps.
- **Why a single sync seam?** Legacy DAOs did their own networking scattered across the UI (its two-sync-engine mess). Here one module owns sync; features never sync directly.
- **Why RHF + zod?** Large multi-step clinical forms (legacy fragments ran ~1,200–2,000 LOC).

## 6. Boundary enforcement

**This is enforced by tooling, not by reading this doc.** `npm run lint` is the source of truth — if it passes, the import is legal.

**Live now** — `eslint-plugin-boundaries` in [`.eslintrc.cjs`](.eslintrc.cjs) declares each `src/*` folder as a layer and enforces three policies against the **current flat layout**:

1. `screens`/`components` must **not** import `src/db` or `src/services/api` — presentation goes through a store or repository.
2. `src/screens` is a **leaf** — only `src/navigation` may import a screen.
3. `src/db` / `src/services` must **not** depend on UI (`components`, `screens`, `navigation`).

Alias (`@/*`) and relative imports are both resolved, so `../../db` cannot sneak past. **Known debt:** `screens/auth/SetupScreen.tsx` violates (1) and carries a scoped `eslint-disable` with a TODO — it must move behind a repository.

**Package boundaries** come from the workspace graph (apps → packages, never the reverse; Turborepo's `dependsOn: ["^build"]` orders builds). Keep `turbo run typecheck lint test` green in CI.

**Not yet enforced:** per-feature isolation (a feature importing only `core/*`, `@ezazi/*`, and itself) — impossible until `src/` is restructured (§2). When that lands, only `boundaries/elements` in the config changes; the policies above still hold.

## 7. Reuse / port / build-new (current branch → target)

| Action | What |
|---|---|
| ✅ **Already extracted (shared)** | `@ezazi/api-client`, `@ezazi/config`, `@ezazi/types` — consume, don't duplicate |
| 🔧 **Port with structural rewrite** | **Auth screens** and existing screens — keep flows/logic, rebuild to **RHF+zod** + the `features/*/{screens,components,stores,data,domain}` layout. *"Reuse" ≠ copy verbatim.* Also: adopt the feature-modular structure (the current `src` is flat). |
| ✅ **Replaced (done)** | `apps/mobile/src/db` — WatermelonDB → **expo-sqlite + Drizzle** (15-table schema ported, migrations generated; landed with the SDK 57 migration) |
| 🆕 **Build new** | `core/db/sync` — **the sync engine, hand-rolled by us; critical path** · `core/services` (LiveKit, RNFirebase, socket.io, background-task) · Drizzle **FK + dirty-flag (`sync`) indexes** and `relations()` for `with:` queries (`TODO` in `src/db/schema.ts`) · **`useMigrations`** boot wiring in `App.tsx` (once the DB gains its first consumer) · Drizzle schema/repository **tests** (the WMDB tests were removed at cutover) |

## 8. Legacy Android module → `apps/mobile` / `packages` mapping

| Legacy Android (`org.intelehealth.ezazi`) | New home |
|---|---|
| `loginActivity`, `setupActivity`, `splash_activity`, `ui/password` | `features/auth` |
| `addNewPatient`, `patientDetailActivity`, `searchPatientActivity`, `ui/patient` | `features/patient` |
| `visitSummaryActivity`, `ui/visit` | `features/visit` |
| `ui/elcg` (WHO LCG), `partogram/`, `epartogramActivity` | `features/labour-care-guide` |
| `stage3/` (delivery, postpartum) | `features/postpartum` |
| `ui/prescription` | `features/prescription` |
| `ui/rtc`, `:klivekit` | `features/teleconsult` + `core/services/{livekit,socket}` |
| `database/` + DAOs | `core/db` (expo-sqlite + Drizzle) |
| `syncModule`, `optimized_sync`, `SyncDAO` | `core/db/sync` |
| `firebase/`, `:fcm` | `core/services/{fcm,firebase}` |
| `networkApiCalls/ApiClient` | `@ezazi/api-client` (shared) |
| `AppConstants`, whitelabel config | `@ezazi/config` (shared) |
| shared DTOs / models | `@ezazi/types` (shared) |

## 9. How to add a new feature (checklist)

1. Create `apps/mobile/src/features/<x>/{screens,components,stores,data,domain}`.
2. Put shared types in `@ezazi/types`; feature-local types + zod schemas in `domain/`. Clinical semantics stay shared (ARCHITECTURE_RULES §7).
3. New persistence: add Drizzle tables/migrations in `core/db/schema`; expose a `useLiveQuery` read.
4. Write the **repository** in `data/` (DB ⊕ `@ezazi/api-client`). Never call sync/API from screens or stores.
5. Build screens; **RHF+zod** for forms; subscribe to live queries / Zustand.
6. Register screens in the feature's navigator; wire into the root navigator.
7. Tests: repository, critical live query, sync reconciliation.
8. Respect boundaries: import only `core/*`, `@ezazi/*`, and this feature.
9. From root: `turbo run typecheck lint test`; in `apps/mobile`: `npx expo-doctor`.

---
_Stack & versions: [`ARCHITECTURE_RULES.md`](ARCHITECTURE_RULES.md) · Monorepo: [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md)._
