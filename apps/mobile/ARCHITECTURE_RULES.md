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

<!-- Superseded 2026-10-15 (Kaveri): adds `@ezazi/clinical-rules`, the new shared clinical rules package (commit 3083a9e), so mobile and web use one copy of the rules. Original text kept for reference:
**Every change for the FHW mobile app is made within the `apps/mobile/` workspace.** Do not modify other workspaces (`apps/web`) as part of mobile work. The shared `packages/*` (`@ezazi/api-client`, `@ezazi/config`, `@ezazi/types`) are consumed by the mobile app but **owned cross-app** — they also affect the web app, so change them only deliberately and in coordination, never as an incidental side effect of a mobile task. When in doubt, keep the change local to `apps/mobile/`.
-->
**Every change for the FHW mobile app is made within the `apps/mobile/` workspace.** Do not modify other workspaces (`apps/web`) as part of mobile work. The shared `packages/*` (`@ezazi/api-client`, `@ezazi/clinical-rules`, `@ezazi/config`, `@ezazi/types`) are consumed by the mobile app but **owned cross-app** — they also affect the web app, so change them only deliberately and in coordination, never as an incidental side effect of a mobile task. When in doubt, keep the change local to `apps/mobile/`.

## 0. Verify on session start (rule)

Before dependency/architecture work in `apps/mobile`:
- Read `apps/mobile/package.json` and compare against §3.
- From the repo root: `npm run typecheck`, `npm run lint`, `npm run test` (Turborepo, filtered to the mobile workspace by CI). In `apps/mobile`: `npx expo install --fix` and `npx expo-doctor`.
- Flag any **forbidden** package (§9 — WatermelonDB, Redux, Realm, PowerSync). *(WatermelonDB was fully removed in the SDK 57 migration — it must not come back.)*
<!-- Superseded 2026-10-15 (Kaveri): adds `@ezazi/clinical-rules`, the new shared clinical rules package (commit 3083a9e), so mobile and web use one copy of the rules. Original text kept for reference:
- Shared code comes from workspace packages `@ezazi/api-client`, `@ezazi/config`, `@ezazi/types` — don't re-implement them app-locally.
-->
- Shared code comes from workspace packages `@ezazi/api-client`, `@ezazi/clinical-rules`, `@ezazi/config`, `@ezazi/types` — don't re-implement them app-locally.

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
| `apps/mobile/index.js` | App entry. Registers the monitor's foreground-service runner and the **one** app-wide notify-kit `onBackgroundEvent` handler — both must run at boot, outside the component tree, so the OS can re-invoke them after killing the process (§11). |

<!-- Superseded 2026-10-15 (Kaveri): adds `@ezazi/clinical-rules`, the new shared clinical rules package (commit 3083a9e), so mobile and web use one copy of the rules. Original text kept for reference:
**Shared packages (consumed by mobile *and* the web app):** `@ezazi/api-client` (HTTP client + `ApiResult` + endpoints), `@ezazi/config` (multi-tenant client registry + env contracts), `@ezazi/types` (domain types).
-->
**Shared packages (consumed by mobile *and* the web app):** `@ezazi/api-client` (HTTP client + `ApiResult` + endpoints), `@ezazi/clinical-rules` (pure clinical rules: card schedule, partogram fields, validation ranges — no DB, no uuids, no clock; see its README), `@ezazi/config` (multi-tenant client registry + env contracts), `@ezazi/types` (domain types).

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
| `@expo-google-fonts/lato` | `0.4.1` | The Lato webfont package. Pinned EXACT, and deliberately not (B) — it is not an Expo SDK module, so `npx expo install` does not manage its version. `App.tsx` gates the splash on `useFonts` until it loads, because `core/ui/Text.tsx` assumes the family is registered. |
| `react-native-notify-kit` | `^10.8.0` | Background services (§11): Android foreground service, AlarmManager-backed trigger notifications, notification channels. Used by `core/services/monitor` and `core/services/batteryGuard`. **Android-only; New-Arch-only** (passes the §5 gate). Config plugin in `app.config.js` (`foregroundService.types: ['dataSync']`). Single-maintainer risk — see §10. |

### (B) SDK-managed — install via `npx expo install`, NEVER hardcode
`expo-sqlite`, `@react-native-async-storage/async-storage`, `react-native-screens`, `react-native-safe-area-context`, `react-native-gesture-handler`, `react-native-reanimated`, `expo-secure-store`, `expo-local-authentication`, `expo-localization`, `expo-notifications`, `expo-background-task`, `expo-status-bar`, `expo-constants`, `expo-linking`, `expo-splash-screen`, `expo-asset`, `react-native-svg`, `expo-crypto`, `expo-font`.

Also SDK-managed (added 2026-10-05 with the low-battery alert, §11): `expo-battery` — battery level + plug state for `core/services/batteryGuard`.

Also SDK-managed (added 2026-10-23 for the observation capture screen): `react-native-pager-view` 8.0.2, the version Expo SDK 57 bundles — swipe between the capture screen's tabs (Figma swipe rule). New Architecture only, so it passes the §5 gate. Added ahead of the capture screen, which is not built yet.

Two more arrived on 2026-10-12 and are listed in (B) above: `expo-crypto` (`randomUUID()`, reached only through `core/db/uuid.ts`) and `expo-font` (required by `@expo-google-fonts/lato`; keep the direct entry rather than relying on `expo` hoisting it).

### (C) Tooling — must be installed
`typescript`, `eslint`, `@typescript-eslint/*`, `eslint-plugin-react(-hooks)`, **`eslint-plugin-boundaries`** (feature isolation), `prettier`, `jest`, `jest-expo`, `@testing-library/react-native`, `drizzle-kit`, `babel-plugin-inline-import`, `@react-native-community/cli`, `turbo` (root).

## 4. Component decisions (why + benefit)

- **Offline DB → `expo-sqlite` + `drizzle-orm` (NOT WatermelonDB).** WMDB 0.28 is unmaintained with **no New-Architecture support** — cannot run on SDK 57. expo-sqlite is first-party/New-Arch; Drizzle adds typed queries + `useLiveQuery`. *Mobile-only* (the web app talks to the API directly).
- **Sync → single-seam engine, hand-rolled and owned by us.** Locked: one module (`apps/mobile/src/core/db/sync`) owns EMR-Middleware pull/push; features never call sync endpoints directly. Semantics: UUID-keyed, `sync` dirty-flag, delta-by-timestamp+location, last-write-wins. **Still to be built** (§10).
- **HTTP → `@ezazi/api-client` (shared package).** axios client + interceptors + `ApiResult`, shared with the web app so both hit the gateway/portal identically.
- **State → `zustand`.** Lightest session/UI state; not Redux (server-cache model conflicts with local-DB-first).
- **Server cache → `@tanstack/react-query` (optional).** Online-only non-persisted reads.
- **Forms → `react-hook-form` + `zod`.** Heavy multi-step clinical forms.
- **Navigation → React Navigation v7.** Imperative model fits the screen-by-screen port. ⚠️ In v7 **`navigate()` behaves like `push()`** — it stacks duplicate screens in sync/queue-driven flows. Use `popTo()` / `getId()` (or the `navigateDeprecated()` bridge) when you mean "return to an existing screen." Custom themes need a `fonts` key.
- **Video → LiveKit; Chat → socket.io; Push/Firebase → @react-native-firebase v26** (modular API; `setBackgroundMessageHandler` for silent-push sync; `expo-notifications` is presentation-only). **Background sync → `expo-background-task`** (best-effort tier; backbone is foreground/on-write + FCM push).

## 5. Adding a native dependency — the New-Arch gate (standing rule)

Before adding/bumping any native package: (1) check **reactnative.directory** for New-Arch support; (2) confirm the **specific version** that added it and pin at/above; (3) `npx expo-doctor`; (4) **if not New-Arch compatible, do not add it.** Pure-JS packages are exempt. After any native change, regenerate native code (`npx expo prebuild --clean -p android`) — `android/` is a disposable CNG artifact, never hand-edited (persistent native config goes through `app.config.js` plugins / `expo-build-properties`). (notify-kit is New-Arch-only, so it *passes* this gate — its open question in §10 is maintainer risk, a different axis.)

## 6. Data / schema & DB conventions (carried from Android)

> **Writing anything under `src/core/db`, or calling it? Read [`DB_CONVENTIONS.md`](DB_CONVENTIONS.md) first.**
> It covers the rules no tool enforces — repository signatures, transactions, the `sync` flag, what
> must never be overwritten, and what already exists so you do not rebuild it. eslint checks import
> boundaries, which is placement, not correctness.

- **`uuid` is the primary key** in each clinical table (Java-UUID / RFC-4122; generate with `expo-crypto` `randomUUID()`). Exceptions: `tbl_location` keys on `locationuuid`; `tbl_user_credentials` uses a synthetic auto-increment PK.
- **Keep `sync` and `voided` columns, stored as `integer`, never `text` — and mirror the API's own types.** `voided` is `integer(...)` exposed as a **number** (0/1), because the wire sends a JSON number; `sync` is `integer(..., { mode: 'boolean' })` exposed as a **boolean**, because the server's `syncd` is a JSON boolean. Both are INTEGER on disk; the TS shape matches the wire shape, so **neither direction needs a conversion**. Do not "harmonise" the two into one shape — that reintroduces a conversion and diverges from the source. The sync contract constrains the **wire** type, not the column type — `voided` rides the outgoing push body as a **JSON number** (`Ob.java:21-23`, `Encounter.java:35-37` in the legacy app, populated from the local row at `PatientsFrameJson.java:224/248`; confirmed against a live server capture). An integer column serialises to that identically. TEXT is what produced the legacy defects: seven distinct spellings on disk, and an `Integer.parseInt` on the raw column sitting directly on the push path (`ObsDAO.java:368`, uncaught — it aborts the whole push). Both failure classes are structurally impossible in an integer column. Declared `notNull()` with a default on **every** table — a NULL flag is invisible to every dirty predicate. No WMDB `_status`/`_changed` on this stack.
- **`z.guid()`, never `z.uuid()`.** zod v4's `uuid()` **rejects** OpenMRS/Java UUIDs. Every UUID field in every schema uses `z.guid()`. (zod v4 also: issues are on `err.issues`; use `.prefault()` for input-typed defaults.)
- **`openDatabaseSync('localrecords.db', { enableChangeListener: true })` is mandatory** — without it Drizzle's `useLiveQuery` never updates.
- **`useLiveQuery` is component-only.** In the sync engine and in stores use `addDatabaseChangeListener` instead. Known bug: `useLiveQuery` can miss JOINed / `with:` changes — prefer per-table live queries.
- **drizzle-kit: `generate` only — never `migrate` or `push`.** Migrations are generated into `apps/mobile/drizzle/` and applied **on device by the post-auth bootstrap**, never by drizzle-kit.
- **Every table is indexed** on its FK/lookup columns plus the `sync` dirty flag (23 indexes, all in migration `0000`; `0001` only drops `tbl_uuid_dictionary`). The one place they cost you is bulk insert: if the initial data load is slow, drop → insert → recreate inside the same transaction rather than deleting them outright.

### DB lifecycle (locked)

- **The database is created only after authentication.** No session token → it is not created, not opened, not touched. `core/db` therefore exposes a **lazy, memoised, invalidatable** handle: opening at module import time is a bug, because merely *importing* `db` would create `localrecords.db` for a logged-out user. Schema init and the initial data pull are driven from the **Home screen** (matching the native Android flow), via a store — screens may not import `core/db` directly.
- **Schema init and data hydration are separate phases with opposite failure policies.** Schema (migrations, then the single `tbl_app_state` bookkeeping row) is idempotent and freely retryable. There are no static seeds — `tbl_uuid_dictionary` was the only seeded table and it was removed 2026-10-12; encounter type names live in `core/db/constants/encounter.ts`. **Initial hydration is atomic** — one transaction, so a failure or an app kill rolls the data back and keeps the schema. **Incremental sync is the opposite:** idempotent upsert-by-uuid, resumable, never rolled back. Do not let hydration's rollback logic leak into incremental sync.
- **Logout destroys the local store**, in this order: cancel in-flight sync → close the connection → delete the database **via expo-sqlite's delete API** (never plain filesystem deletion: SQLite leaves `-wal`/`-shm` sidecars, and removing only the `.db` can leave a fresh database picking up a stale WAL) → delete any staged payload files, which hold clinical data → invalidate the memoised handle. A second provider on the same device therefore starts clean.
- **SQLite has a single writer.** Async DB APIs do **not** make writes parallel — concurrent writers serialise at best and throw `SQLITE_BUSY` at worst. "Async" here means "does not block the JS thread", never "concurrent".
- **Rows arriving from the server are written with `sync = true` (clean).** The column default is *dirty*, which is correct for locally-created rows, so pull-apply must set clean **explicitly** — otherwise the push engine re-uploads the entire initial pull. Map the server's `syncd` field deliberately; never write the deserialised value through. Note the wire name is **`syncd`**, not `sync`, and it is absent entirely from six of the nine pull lists.
- **`tbl_user_credentials` is unused.** It exists only because it existed in the native Android app; its purpose is not documented and **nothing is designed around it**. Do not infer one.

## 6b. Comment budget (hard limits)

Comments explain **why**, never what the code already says. Over-long comments go stale and get ignored.

- **JSDoc / block doc comments — max 5 lines.**
- **Multi-line inline comments — max 2 lines.**
- **Same-line (trailing) comments — 0–10 words.**

If an explanation genuinely needs more room, it belongs in a doc, not in the source.

## 7. White-label boundary (what may / may not differ per client)

Ships as **eZAZI (India)** and **eLCG (Nepal)** from one codebase (`@ezazi/config` — **shared with the web app**, so the boundary holds across *both* apps).

<!-- Superseded 2026-10-15 (Kaveri): names `@ezazi/clinical-rules` and the one clinical exception, per-client validation range values (decided 2026-10-14, §7a). Original text kept for reference:
**MUST be identical across all clients (shared code / `@ezazi/config` / `@ezazi/types`, never a per-client branch):** clinical rules & concept UUIDs, DB schema, sync payload shape & endpoints, validation logic, domain algorithms (risk scores, partograph/LCG, delivery/postpartum).
-->
**MUST be identical across all clients (shared code / `@ezazi/clinical-rules` / `@ezazi/config` / `@ezazi/types`, never a per-client branch):** clinical rules & concept UUIDs, DB schema, sync payload shape & endpoints, validation logic (the checks themselves — range *values* are the one exception, §7a), domain algorithms (risk scores, partograph/LCG, delivery/postpartum).

**MAY differ per client (via `@ezazi/config` client entries + `app.config.js` only):** app name/icon/splash/brand colors, default locale/language, calendar (BS/AD), dial-code + number length, server URLs per env, "powered by" mark, presentational/rollout flags **only**.

**Rule:** a new client = one new `ClientConfig` entry + assets. Clinical meaning goes in shared code, never a client config.

### 7a. Per-client validation ranges — the one clinical exception (decided 2026-10-14)

Requirement: every client captures **the same fields**, but a client may need **different validation ranges** (e.g. the allowed pulse). This is the only clinical value allowed to differ, and only in this shape:

- **Identical for every client:** fields, sections, options and their stored values, which card shows which field, card schedule, cross-field rules (e.g. diastolic < systolic), the validation functions themselves, and **alert thresholds** (WHO LCG — they drive `obs.comment` and the risk score). Only the numeric **min/max of a validation range** may differ.
- **Where the values live:** only in `@ezazi/clinical-rules`, as named **range profiles**. `BASE_RANGES` holds the Android values; every profile, `default` included, lists **only the ranges it changes** and inherits the rest from `BASE_RANGES`. Never in `@ezazi/config`, never in an app, never fetched at runtime.
- **How a client gets its profile:** the validation functions take the profile id as an input. Each app maps its client to a profile id in **one place**, and a test checks that every registered client maps to an existing profile. Mobile: `src/core/config/rangeProfile.ts` (`RANGE_PROFILE` is the build client's profile, picked automatically).
- **Guard rails (enforced by the package's tests):** an override may change only `min`/`max` — never the unit, the decimals or the field; `min < max`; the range must fit the field's input limit.
- **Change control:** a profile change is a clinical change — it needs clinical review, like any other rule in the package.

## 8. Version bump policy

- **SDK-managed (§3B):** bump only via `npx expo install --fix`. Note `--fix` bumps runtime deps but leaves devDeps (`jest-expo`, `@types/react`, `react-test-renderer`) lagging — patch those by hand or hit peer conflicts.
- **Pinned minors (§3A), esp. pre-1.0 `drizzle-orm`:** require a named owner review + green `turbo run typecheck lint test` before merge. Escape valve: pin last-good exact version, open an issue — do not float.
- **Majors** of Node/React/RN/Expo SDK / any pinned lib: named reviewer, re-run the New-Arch gate (§5), migration note. One major per commit.

## 9. Non-negotiables (DO NOT)

- **DO NOT** re-propose **WatermelonDB, Redux/RTK, Realm, or PowerSync** (rejected). *(WMDB was fully removed in the SDK 57 migration — it does not come back.)*
- **DO NOT** let a feature call sync/API endpoints directly — go through repositories and the single sync module.
- **DO NOT** store clinical data in Zustand; **DO NOT** hand-roll form state with `useState`.
- **DO NOT** hardcode SDK-managed versions (§3B).
<!-- Superseded 2026-10-15 (Kaveri): adds the §7a exception, per-client validation range values kept only in `@ezazi/clinical-rules`. Original text kept for reference:
- **DO NOT** put anything affecting clinical meaning in a per-client config (§7).
-->
- **DO NOT** put anything affecting clinical meaning in a per-client config (§7). Per-client validation range values are the single exception, and they live only in `@ezazi/clinical-rules` range profiles (§7a).
- **DO NOT** write clinical rules or clinical values (card schedule, fields and options, validation ranges, alert thresholds) inside an app. They live in `@ezazi/clinical-rules`, which mobile and web both import — import from the package root only (eslint).
- **DO NOT** make mobile changes outside `apps/mobile/` — `apps/web` is off-limits for mobile work; shared `packages/*` are changed deliberately/coordinated (they affect web), never incidentally (see **Scope** above).
- **DO NOT** make a `packages/*` depend on an `apps/*` — dependencies flow apps → packages, never the reverse.
- **DO NOT** render the app bar inside a screen or build a screen-local one — it is mounted by the navigator via the presets in `navigation/screenOptions.tsx` (`brandAppBar`, `noHeader`, and the labour `patientAppBar` / `patientCaptureAppBar`) (the RN "BaseActivity"; MOBILE_STACK §3.1).
- **DO NOT** downgrade to old architecture.
- **DO NOT** hand-edit `apps/mobile/android/` — it is regenerated by `expo prebuild` (§5).
- **DO NOT** register a second notify-kit `onBackgroundEvent` — the one handler lives in `index.js`; a new background service adds a branch there (§11). Enforced by eslint (`no-restricted-syntax`).

> **Related artifacts:** the external prompt library (v1.1) still references WMDB commands (needs v1.2).

## 10. Open decisions & status

- **⏳ UNBUILT — the sync engine:** hand-rolled and owned by us (`apps/mobile/src/core/db/sync`). The single-seam design (§4) is **locked**; the implementation is the remaining critical-path work. Trigger backbone: foreground/on-write + FCM silent-push, with `expo-background-task` as a best-effort tier.
- **✅ DONE — the DB layer:** FK/dirty-flag indexes, `relations()`, the `schema/` split, 10 repositories behind `core/db/repositories/index.ts`, and 19 test specs. Migrations apply through `migrate()` inside `ensureSchema()`, **not** `useMigrations`. Rules that no tool could enforce are in [`DB_CONVENTIONS.md`](DB_CONVENTIONS.md); five of them are now eslint rules.
- **⏳ REMAINING build-out** (LiveKit / Firebase / background-task services) — tracked in [`MOBILE_STACK.md`](MOBILE_STACK.md) §7. *(The feature-modular restructure itself is ✅ done — 2026-09-10.)*
- **✅ VALIDATED — Drizzle at runtime:** confirmed on hardware 2026-10-12 on a fresh install — both migrations applied, 17 tables, 23 indexes, `tbl_app_state` seeded `pending`. No repository call has run on-device yet, because nothing consumes the layer: the tests exercise it against sql.js, not expo-sqlite.
- **🟠 PARTIAL — shared-package adoption: `@ezazi/api-client` ✅ done, `@ezazi/config` + `@ezazi/types` ❌ not yet.**
  - **Done (2026-09-10):** `apps/mobile` now consumes `@ezazi/api-client`. The five files it had duplicated — `createApiClient`, `interceptors`, `ApiError`, `mapAxiosError`, `ApiResult` — were byte-identical copies and have been **deleted**; `src/services/api` is now the thin adapter the design always called for (`client.ts` supplies the secure-store token provider + refresh-on-401 dedupe; `logApiError` stays RN-only because LogBox hijacks `console.warn`; `responseHandler` + `*.api.ts` stay mobile-owned). The 35 unit tests covering the extracted code moved with it into `packages/api-client` as vitest specs — the package previously had **none**, so both apps were relying on untested shared transport code.
  - **Deliberate:** `src/services/api/index.ts` does **not** re-export the shared symbols. Import them from `@ezazi/api-client` directly — a local alias is exactly how the two apps drifted apart the first time.
  - **Still open:** nothing in `apps/mobile/src` imports `@ezazi/config` or `@ezazi/types` (verify: `grep -rn '@ezazi/' apps/mobile/src`). Mobile still runs its own `src/config/clients/{registry,types,default,nepal}`. `packages/config` is already generalized for this — `ClientBrandConfig<TAsset>` exists precisely so mobile can instantiate it as `ClientBrandConfig<ImageSourcePropType>` while web uses `ClientBrandConfig<string>`. Two live copies of the client registry put the §7 white-label boundary at risk of silent divergence, so this is the next one to close.
- **🟠 PARTIAL — CI + testing:** `.github/workflows/mobile-ci.yml` runs `turbo run typecheck lint test` (Node 20) on PRs touching `apps/mobile`/`packages`. **Still missing:** coverage thresholds and `expo-doctor`. *(The boundaries rule runs at `error` in the lint step, and the Drizzle schema/repository tests exist — 19 specs under `core/db/__tests__/`.)*
<!-- Superseded 2026-10-08 — kept for history. notify-kit was adopted for the labour monitor and the
     low-battery alert (see the replacement entry below and §11), so "adopt only if…" no longer describes
     the repo. The single-maintainer risk it named still stands and is carried into the new entry.
- **🟡 REVISIT — `react-native-notify-kit`:** adopt only if continuous background sync is needed **and** foreground+FCM proven insufficient. Android-only; single-maintainer risk.
-->
- **✅ ADOPTED (2026-10) — `react-native-notify-kit`:** in use for background services (§11) — the labour monitor's foreground service + AlarmManager backbone, and the low-battery alert. Adopted because the 2026-10-01 soak test showed a JS timer stops once the app is backgrounded, and only an OS alarm (`SET_EXACT_AND_ALLOW_WHILE_IDLE`) kept firing through Doze. **Still open:** Android-only; single-maintainer risk; whether *sync* (as opposed to monitoring) also needs it is still undecided — the original foreground+FCM question for sync stands.
- **🟡 REVISIT — Drizzle 1.0 GA:** move off 0.45.x when GA.
- **🟡 REVISIT — TypeScript 6:** held at 5.9 via `expo.install.exclude`.

## 11. Background services (labour monitor, low-battery alert)

> Added 2026-10-08. Code: `src/core/services/monitor/` and `src/core/services/batteryGuard/` — each has a README with the full detail. This section holds the rules; the one-line tripwires are in [`CLAUDE.md`](CLAUDE.md).

**Where they live and how they run.** Long-lived background services go in `core/services/<name>/`. Each exposes a `use<Name>(enabled)` hook that `App.tsx` (the composition root) calls with `authStatus === 'authenticated'` — so a service starts after login and its cleanup stops it on logout. Anything the OS must be able to call after killing the process (the foreground-service runner, the background-event handler) is registered in `index.js`, at boot.

**Native config they depend on** (`app.config.js`): the `SCHEDULE_EXACT_ALARM` permission, `POST_NOTIFICATIONS`, and the notify-kit plugin with `foregroundService.types: ['dataSync']`.

**Rules — each one learned on a device, none caught by tsc/jest:**

1. **A JS timer is not a background clock.** RN's `setInterval`/`setTimeout` fire on Android Choreographer frame callbacks, which stop once there is no visible window. No wake lock, Doze exemption or headless task changes that (2026-10-01 soak test, emulator + Galaxy Tab A11). Anything that must fire while backgrounded uses an AlarmManager trigger (`SET_EXACT_AND_ALLOW_WHILE_IDLE`).
2. **Exact alarms need `SCHEDULE_EXACT_ALARM`.** Without it the trigger silently falls back to an inexact alarm that Android may delay by minutes (seen in logcat).
3. **Only one `onBackgroundEvent` per app.** A second registration replaces the first and silently kills the other service's alarm chain. It lives in `index.js`; add a branch per trigger id. Enforced by eslint (§9).
4. **Handle trigger delivery in the foreground too.** `onBackgroundEvent` misses deliveries while the app is open, so each service also subscribes with `onForegroundEvent`. The delivery handler is what re-arms the next alarm — missing one foreground delivery ends the chain (the 15-minute soak recorded zero backbone ticks for this reason).
5. **Clear the "running" flag before cancelling the trigger.** The delivery handler reads that flag to decide whether to re-arm; clearing it first stops an in-flight delivery from re-arming after stop/logout.
6. **A notification channel's importance and sound are fixed at creation.** Later changes are ignored on-device. To change them, create a new channel id (hence the `-v2` ids).
7. **Start only after login.** Starting on mount raced SplashScreen's own `POST_NOTIFICATIONS` request and hung Splash on "Loading…".
8. **`startForegroundService()` can be refused** (`ForegroundServiceStartNotAllowedException`) when Android does not consider the app visible — e.g. a cold start behind the lock screen. Starting must retry, never fail silently.
9. **Stop everything on logout**, including any `ongoing` notification, which the user cannot swipe away.

**Card engine** (`core/services/cardGeneration/`, added 2026-10-23; Android's `CardGenerationEngine`):

10. **Scan every minute, after the re-arm.** The backbone delivery re-arms first, then calls `runCardScan`, so a failed scan never ends the alarm chain. One more scan runs right after login as a catch-up.
11. **No session, no scan.** `runCardScan` returns without opening the database when there is no access token or writer identity (§6).
12. **One scan at a time, one transaction per visit.** An overlapping call shares the running scan's result; each visit's new card, Decision Pending flag and missed markers are written together. A visit that fails is logged and skipped, so the others still get their cards (a deviation: Android aborts the whole tick; decided 2026-10-27, Kaveri).
13. **New-card alert on its own channel** (`labour-new-card-v1`, sound `al_1`, bundled by `plugins/withAlertSound.js`). Rule 6 applies: a change of sound or importance needs a new channel id.

**Current state:** the 1-minute alarm is the production cadence (decided 2026-10-23). The 5 s heartbeat is foreground-only and for dev visibility — see the monitor README.

---
_Structure & the "why": [`MOBILE_STACK.md`](MOBILE_STACK.md) · Monorepo: [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md)._
