# Architecture Rules — `@ezazi/mobile` (eZAZI / eLCG FHW App)

> **Read this when:** changing dependencies or versions, bumping the Expo SDK, adding a native module, or deciding what the stack may contain. Folder/import questions → run `npm run lint`, not this doc. Always-loaded summary: [`CLAUDE.md`](CLAUDE.md).
>
> **Binding rule book for the mobile app's stack.** Governs the **`apps/mobile`** workspace of the `ezazi-monorepo`. Decisions are **LOCKED** — do not re-litigate them or propose already-rejected alternatives (§9). The sync engine is **ours to hand-roll**; only its *implementation* is outstanding (§10), not its design.
>
> **Companions:** [`MOBILE_STACK.md`](MOBILE_STACK.md) (structure & remaining build-out) · monorepo overview: [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md).
> **Last reviewed:** 2026-09-10 · **Revisit at:** the next Expo SDK bump.
>
> **Repo status: migration COMPLETE — `apps/mobile` runs on Expo SDK 57.** The SDK 51→57 / New-Architecture / WatermelonDB→Drizzle migration landed 2026-09-10 (**RN 0.86.3 · React 19.2.3 · New Arch · React Navigation v7 · zod v4 · zustand v5 · expo-sqlite + Drizzle**), typecheck-green across all workspaces and **validated running on a physical device**. The versions below are the **live state**, not a target.

## 🔒 Scope — all changes happen inside `apps/mobile/`

**Every change for the FHW mobile app is made within the `apps/mobile/` workspace.** Do not modify other workspaces (`apps/web`) as part of mobile work. The shared `packages/*` (`@ezazi/api-client`, `@ezazi/config`, `@ezazi/types`) are consumed by the mobile app but **owned cross-app** — they also affect the web app, so change them only deliberately and in coordination, never as an incidental side effect of a mobile task. When in doubt, keep the change local to `apps/mobile/`.

## 0. Verify on session start (rule)

Before dependency/architecture work in `apps/mobile`:
- Read `apps/mobile/package.json` and compare against §3.
- From the repo root: `npm run typecheck`, `npm run lint`, `npm run test` (Turborepo, filtered to the mobile workspace by CI). In `apps/mobile`: `npx expo install --fix` and `npx expo-doctor`.
- Flag any **forbidden** package (§9 — WatermelonDB, Redux, Realm, PowerSync). *(WatermelonDB was fully removed in the SDK 57 migration — it must not come back.)*
- Shared code comes from workspace packages `@ezazi/api-client`, `@ezazi/config`, `@ezazi/types` — don't re-implement them app-locally.

---

## 1. Platform target (non-negotiable)

| Concern | Target | Rule |
|---|---|---|
| Expo SDK | **57** | Pin `expo@^57` (≥ **57.0.17** — earlier 57.x has a Hermes V1 memory/startup regression that hits reanimated); align with `npx expo install --fix`. |
| React Native | **0.86** | Ships with SDK 57; never install directly. |
| React | **19.2** | Ships with SDK 57. |
| Architecture | **New Architecture** (Fabric + TurboModules + Bridgeless) | Mandatory from SDK 55+. Every native module must be New-Arch compatible (§5). |
| Node | **20 (min 20.19.4)** | Monorepo pins `engines.node: ">=20 <21"`; Node 20.19.4+ satisfies SDK 57. ⚠️ **SDK 58 / RN 0.87 will require Node 22** — a known future bump; the monorepo `engines` cap will need lifting then. |
| Language | **TypeScript strict** | `strict: true` (extends `tsconfig.base.json`). Held at **5.9** via `expo.install.exclude` — the TS 6 major is deferred. |
| Runtime app | **Custom dev client (EAS)** — not Expo Go | LiveKit / Firebase / SQLite are native. |
| Package manager | **npm workspaces** (`npm@10.8.2`) + **Turborepo** | Root lockfile; run tasks via `turbo`. |

## 2. Related files & env

| File | Role |
|---|---|
| **root** `package.json` | Workspaces (`apps/*`, `packages/*`), `engines.node`, turbo scripts |
| **root** `turbo.json` | Task graph (build/lint/typecheck/test) |
| **root** `tsconfig.base.json` | Shared TS config all workspaces extend |
| `apps/mobile/app.config.js` | Dynamic Expo config; per-client branding via `EXPO_PUBLIC_CLIENT_ID` (§7) |
| `apps/mobile/eas.json` | EAS Build profiles (dev/preview/prod) |
| `apps/mobile/package.json` | Mobile deps (§3) + workspace deps on `@ezazi/*` |
| `apps/mobile/{babel,metro,jest}.config.js` | Bundler/test config — **required for Drizzle:** `metro.config.js` pushes `sql` onto `resolver.sourceExts`; `babel.config.js` runs `['inline-import', { extensions: ['.sql'] }]` (and must stay **before** `react-native-worklets/plugin` when that is added) so bundled `.sql` migrations resolve. Missing either = an empty DB in a release build. |
| `apps/mobile/drizzle/` | **Generated** migrations (`drizzle-kit generate`) + `migrations.js` — committed, applied on-device |
| `apps/mobile/.env` | `EXPO_PUBLIC_*` config (no secrets) |

**Shared packages (consumed by mobile *and* the web app):** `@ezazi/api-client` (HTTP client + `ApiResult` + endpoints), `@ezazi/config` (multi-tenant client registry + env contracts), `@ezazi/types` (domain types).

**Env vars (`EXPO_PUBLIC_*`)** — gate every API/service call: `AUTH_GATEWAY_URL`, `PORTAL_URL`, `WEBRTC_URL`, `CONFIG_URL`, `CLIENT_ID`, `APP_ENV`, `DEFAULT_COUNTRY/LOCALE/CALENDAR`, `FEATURE_FLAG_*` (presentational only — §7), `SENTRY_DSN`.

## 3. Version manifest

Pins live in `apps/mobile/package.json`. **Two classes — do not confuse them.** Every runtime dependency in `package.json` belongs to exactly one of them: if you add a dep and it appears in neither list below, its bump policy (§8) is undefined — add the row in the same commit.

### (A) Independently pinned
| Package | Pin | Role |
|---|---|---|
| `drizzle-orm` | `^0.45.2` | ORM + `useLiveQuery` reactivity. Pre-1.0 — bump only per §8. |
| `@livekit/react-native` · `-webrtc` · `livekit-client` · `-expo-plugin` · `@config-plugins/react-native-webrtc` | `^2.12` / `144.1.2` / `^2.22` / `^1.0.2` / latest | Video; **two** config plugins; dev client. |
| `socket.io-client` | `^4.8.3` | Chat/signaling (`transports:['websocket']`). |
| `@react-native-firebase/{app,messaging,database,remote-config,crashlytics}` | `26.4.0` | Push + RTDB + Remote Config + Crashlytics (New-Arch; modular API). |
| `@react-navigation/{native,native-stack,bottom-tabs}` | `^7.x` | Navigation. |
| `zustand` | `^5.0.0` | Session/UI state. |
| `@tanstack/react-query` | `^5.0.0` | **Optional** — online-only reads not persisted to the DB. |
| `react-hook-form` · `zod` · `@hookform/resolvers` | `^7.87` · `^4.5` · `^5.9` | Forms. **RHF not v8; zod v4 not v3; resolvers ≥ 5.2.1.** |
| `i18next` · `react-i18next` · `intl-pluralrules` | `^23.15` · `^15.0` · `^2.0.1` | i18n. `intl-pluralrules` is a **required polyfill** — Hermes ships no `Intl.PluralRules`; dropping it breaks i18next at runtime. |
| `dayjs` · `nepali-date-converter` | `^1.11` · `^3.4` | Calendar: AD + Nepali BS. Which one a client uses is a per-client config choice (§7); both ship in every build. |
| `axios` | `^1.7` | Transport under `@ezazi/api-client`, which owns the client factory + interceptors. Direct use in mobile is deliberately limited to the raw refresh POST in `services/api/client.ts` (must bypass the interceptor to avoid recursing on 401) and type-only imports. **Build new API surface on `@ezazi/api-client`, not raw axios.** |

### (B) SDK-managed — install via `npx expo install`, NEVER hardcode
`expo-sqlite`, `@react-native-async-storage/async-storage`, `react-native-screens`, `react-native-safe-area-context`, `react-native-gesture-handler`, `react-native-reanimated`, `expo-secure-store`, `expo-local-authentication`, `expo-localization`, `expo-notifications`, `expo-background-task`, `expo-status-bar`, `expo-constants`, `expo-linking`, `expo-splash-screen`, `expo-asset`, `react-native-svg`.

### (C) Tooling — must be installed
`typescript`, `eslint`, `@typescript-eslint/*`, `eslint-plugin-react(-hooks)`, **`eslint-plugin-boundaries`** (feature isolation), `prettier`, `jest`, `jest-expo`, `@testing-library/react-native`, `drizzle-kit`, `babel-plugin-inline-import`, `@react-native-community/cli`, `turbo` (root).

## 4. Component decisions (why + benefit)

- **Offline DB → `expo-sqlite` + `drizzle-orm` (NOT WatermelonDB).** WMDB 0.28 is unmaintained with **no New-Architecture support** — cannot run on SDK 57. expo-sqlite is first-party/New-Arch; Drizzle adds typed queries + `useLiveQuery`. *Mobile-only* (the web app talks to the API directly).
- **Sync → single-seam engine, hand-rolled and owned by us.** Locked: one module (`apps/mobile/src/db/sync`) owns EMR-Middleware pull/push; features never call sync endpoints directly. Semantics: UUID-keyed, `sync` dirty-flag, delta-by-timestamp+location, last-write-wins. **Still to be built** (§10).
- **HTTP → `@ezazi/api-client` (shared package).** axios client + interceptors + `ApiResult`, shared with the web app so both hit the gateway/portal identically.
- **State → `zustand`.** Lightest session/UI state; not Redux (server-cache model conflicts with local-DB-first).
- **Server cache → `@tanstack/react-query` (optional).** Online-only non-persisted reads.
- **Forms → `react-hook-form` + `zod`.** Heavy multi-step clinical forms.
- **Navigation → React Navigation v7.** Imperative model fits the screen-by-screen port. ⚠️ In v7 **`navigate()` behaves like `push()`** — it stacks duplicate screens in sync/queue-driven flows. Use `popTo()` / `getId()` (or the `navigateDeprecated()` bridge) when you mean "return to an existing screen." Custom themes need a `fonts` key.
- **Video → LiveKit; Chat → socket.io; Push/Firebase → @react-native-firebase v26** (modular API; `setBackgroundMessageHandler` for silent-push sync; `expo-notifications` is presentation-only). **Background sync → `expo-background-task`** (best-effort tier; backbone is foreground/on-write + FCM push).

## 5. Adding a native dependency — the New-Arch gate (standing rule)

Before adding/bumping any native package: (1) check **reactnative.directory** for New-Arch support; (2) confirm the **specific version** that added it and pin at/above; (3) `npx expo-doctor`; (4) **if not New-Arch compatible, do not add it.** Pure-JS packages are exempt. After any native change, regenerate native code (`npx expo prebuild --clean -p android`) — `android/` is a disposable CNG artifact, never hand-edited (persistent native config goes through `app.config.js` plugins / `expo-build-properties`). (notify-kit is New-Arch-only, so it *passes* this gate — its open question in §10 is maintainer risk, a different axis.)

## 6. Data / schema & DB conventions (carried from Android)

- **`uuid` is the primary key** in each clinical table (Java-UUID / RFC-4122; generate with `expo-crypto` `randomUUID()`). Exceptions: `tbl_location` keys on `locationuuid`; `tbl_user_credentials` uses a synthetic auto-increment PK.
- **Keep `sync` and `voided` columns** — the server sync contract depends on the exact types. No WMDB `_status`/`_changed` on this stack.
- **`z.guid()`, never `z.uuid()`.** zod v4's `uuid()` **rejects** OpenMRS/Java UUIDs. Every UUID field in every schema uses `z.guid()`. (zod v4 also: issues are on `err.issues`; use `.prefault()` for input-typed defaults.)
- **`openDatabaseSync('localrecords.db', { enableChangeListener: true })` is mandatory** — without it Drizzle's `useLiveQuery` never updates.
- **`useLiveQuery` is component-only.** In the sync engine and in stores use `addDatabaseChangeListener` instead. Known bug: `useLiveQuery` can miss JOINed / `with:` changes — prefer per-table live queries.
- **drizzle-kit: `generate` only — never `migrate` or `push`.** Migrations are generated into `apps/mobile/drizzle/` and applied **on device by the post-auth bootstrap**, never by drizzle-kit.
- **Every table is indexed** on its FK/lookup columns plus the `sync` dirty flag (23 indexes, migration `0001`). The one place they cost you is bulk insert: if the initial data load is slow, drop → insert → recreate inside the same transaction rather than deleting them outright.

### DB lifecycle (locked)

- **The database is created only after authentication.** No session token → it is not created, not opened, not touched. `core/db` therefore exposes a **lazy, memoised, invalidatable** handle: opening at module import time is a bug, because merely *importing* `db` would create `localrecords.db` for a logged-out user. Schema init and the initial data pull are driven from the **Home screen** (matching the native Android flow), via a store — screens may not import `core/db` directly.
- **Schema init and data hydration are separate phases with opposite failure policies.** Schema (migrations + static seeds) is idempotent and freely retryable. **Initial hydration is atomic** — one transaction, so a failure or an app kill rolls the data back and keeps the schema. **Incremental sync is the opposite:** idempotent upsert-by-uuid, resumable, never rolled back. Do not let hydration's rollback logic leak into incremental sync.
- **Logout destroys the local store**, in this order: cancel in-flight sync → close the connection → delete the database **via expo-sqlite's delete API** (never plain filesystem deletion: SQLite leaves `-wal`/`-shm` sidecars, and removing only the `.db` can leave a fresh database picking up a stale WAL) → delete any staged payload files, which hold clinical data → invalidate the memoised handle. A second provider on the same device therefore starts clean.
- **SQLite has a single writer.** Async DB APIs do **not** make writes parallel — concurrent writers serialise at best and throw `SQLITE_BUSY` at worst. "Async" here means "does not block the JS thread", never "concurrent".
- **Rows arriving from the server are written with `sync = 'true'`**, or the push engine will try to re-upload the entire initial pull.
- **`tbl_user_credentials` is unused.** It exists only because it existed in the native Android app; its purpose is not documented and **nothing is designed around it**. Do not infer one.

## 7. White-label boundary (what may / may not differ per client)

Ships as **eZAZI (India)** and **eLCG (Nepal)** from one codebase (`@ezazi/config` — **shared with the web app**, so the boundary holds across *both* apps).

**MUST be identical across all clients (shared code / `@ezazi/config` / `@ezazi/types`, never a per-client branch):** clinical rules & concept UUIDs, DB schema, sync payload shape & endpoints, validation logic, domain algorithms (risk scores, partograph/LCG, delivery/postpartum).

**MAY differ per client (via `@ezazi/config` client entries + `app.config.js` only):** app name/icon/splash/brand colors, default locale/language, calendar (BS/AD), dial-code + number length, server URLs per env, "powered by" mark, presentational/rollout flags **only**.

**Rule:** a new client = one new `ClientConfig` entry + assets. Clinical meaning goes in shared code, never a client config.

## 8. Version bump policy

- **SDK-managed (§3B):** bump only via `npx expo install --fix`. Note `--fix` bumps runtime deps but leaves devDeps (`jest-expo`, `@types/react`, `react-test-renderer`) lagging — patch those by hand or hit peer conflicts.
- **Pinned minors (§3A), esp. pre-1.0 `drizzle-orm`:** require a named owner review + green `turbo run typecheck lint test` before merge. Escape valve: pin last-good exact version, open an issue — do not float.
- **Majors** of Node/React/RN/Expo SDK / any pinned lib: named reviewer, re-run the New-Arch gate (§5), migration note. One major per commit.

## 9. Non-negotiables (DO NOT)

- **DO NOT** re-propose **WatermelonDB, Redux/RTK, Realm, or PowerSync** (rejected). *(WMDB was fully removed in the SDK 57 migration — it does not come back.)*
- **DO NOT** let a feature call sync/API endpoints directly — go through repositories and the single sync module.
- **DO NOT** store clinical data in Zustand; **DO NOT** hand-roll form state with `useState`.
- **DO NOT** hardcode SDK-managed versions (§3B).
- **DO NOT** put anything affecting clinical meaning in a per-client config (§7).
- **DO NOT** make mobile changes outside `apps/mobile/` — `apps/web` is off-limits for mobile work; shared `packages/*` are changed deliberately/coordinated (they affect web), never incidentally (see **Scope** above).
- **DO NOT** make a `packages/*` depend on an `apps/*` — dependencies flow apps → packages, never the reverse.
- **DO NOT** downgrade to old architecture.
- **DO NOT** hand-edit `apps/mobile/android/` — it is regenerated by `expo prebuild` (§5).

> **Related artifacts:** the external prompt library (v1.1) still references WMDB commands (needs v1.2).

## 10. Open decisions & status

- **⏳ UNBUILT — the sync engine:** hand-rolled and owned by us (`apps/mobile/src/db/sync`). The single-seam design (§4) is **locked**; the implementation is the remaining critical-path work. Trigger backbone: foreground/on-write + FCM silent-push, with `expo-background-task` as a best-effort tier.
- **⏳ REMAINING build-out** (Drizzle FK/dirty-flag indexes + `relations()`, **splitting `core/db/schema.ts` into `schema/`**, `useMigrations` boot wiring, LiveKit / Firebase / background-task services) — tracked in [`MOBILE_STACK.md`](MOBILE_STACK.md) §7. *(The feature-modular restructure itself is ✅ done — 2026-09-10.)*
- **⏳ UNVALIDATED — Drizzle at runtime:** the app runs on-device, but the screens exercised so far use the API + secure storage. The DB opening/querying on a real device is confirmed the first time a DB-backed screen renders.
- **🟠 PARTIAL — shared-package adoption: `@ezazi/api-client` ✅ done, `@ezazi/config` + `@ezazi/types` ❌ not yet.**
  - **Done (2026-09-10):** `apps/mobile` now consumes `@ezazi/api-client`. The five files it had duplicated — `createApiClient`, `interceptors`, `ApiError`, `mapAxiosError`, `ApiResult` — were byte-identical copies and have been **deleted**; `src/services/api` is now the thin adapter the design always called for (`client.ts` supplies the secure-store token provider + refresh-on-401 dedupe; `logApiError` stays RN-only because LogBox hijacks `console.warn`; `responseHandler` + `*.api.ts` stay mobile-owned). The 35 unit tests covering the extracted code moved with it into `packages/api-client` as vitest specs — the package previously had **none**, so both apps were relying on untested shared transport code.
  - **Deliberate:** `src/services/api/index.ts` does **not** re-export the shared symbols. Import them from `@ezazi/api-client` directly — a local alias is exactly how the two apps drifted apart the first time.
  - **Still open:** nothing in `apps/mobile/src` imports `@ezazi/config` or `@ezazi/types` (verify: `grep -rn '@ezazi/' apps/mobile/src`). Mobile still runs its own `src/config/clients/{registry,types,default,nepal}`. `packages/config` is already generalized for this — `ClientBrandConfig<TAsset>` exists precisely so mobile can instantiate it as `ClientBrandConfig<ImageSourcePropType>` while web uses `ClientBrandConfig<string>`. Two live copies of the client registry put the §7 white-label boundary at risk of silent divergence, so this is the next one to close.
- **🟠 PARTIAL — CI + testing:** `.github/workflows/mobile-ci.yml` runs `turbo run typecheck lint test` (Node 20) on PRs touching `apps/mobile`/`packages`. **Still missing:** coverage thresholds, `expo-doctor`, the `eslint-plugin-boundaries` rule in CI, and Drizzle schema/repository tests (the old WMDB tests were deleted at cutover).
- **🟡 REVISIT — `react-native-notify-kit`:** adopt only if continuous background sync is needed **and** foreground+FCM proven insufficient. Android-only; single-maintainer risk.
- **🟡 REVISIT — Drizzle 1.0 GA:** move off 0.45.x when GA.
- **🟡 REVISIT — TypeScript 6:** held at 5.9 via `expo.install.exclude`.

---
_Structure & the "why": [`MOBILE_STACK.md`](MOBILE_STACK.md) · Monorepo: [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md)._
