# `@ezazi/mobile` — eZAZI / eLCG FHW app

Offline-first Expo/React Native app for frontline health workers (clinical data). Part of `ezazi-monorepo`: this workspace **consumes** `@ezazi/api-client`, `@ezazi/config`, `@ezazi/types` from `packages/*` — never re-implement them locally, and never make a package import an app.

**Stack (LOCKED):** Expo SDK 57 · RN 0.86 · React 19.2 · **New Architecture** · expo-sqlite + Drizzle · React Navigation v7 · zod v4 · zustand v5 · RHF 7 · Node 20. Custom dev client, **not** Expo Go.

## Tripwires — silent, costly, and no tool catches them

1. **`z.guid()`, never `z.uuid()`** — zod v4's `uuid()` *rejects* OpenMRS/Java UUIDs, so every UUID field silently fails validation.
2. **`openDatabaseSync(…, { enableChangeListener: true })` is mandatory** — without it Drizzle's `useLiveQuery` never updates and the UI just looks frozen.
3. **`useLiveQuery` is component-only** — in the sync engine and in stores use `addDatabaseChangeListener`. It can miss `JOIN`/`with:` changes; prefer per-table queries.
4. **drizzle-kit `generate` only** — never `migrate`/`push`. Migrations live in `drizzle/` and apply on-device via `useMigrations`.
5. **Metro `sql` sourceExt + babel `inline-import` are load-bearing** — drop either and release builds ship an **empty database**.
6. **Nav v7 `navigate()` behaves like `push()`** — it stacks duplicate screens in queue/sync flows; use `popTo()`/`getId()` to return to an existing screen.
7. **`android/` is generated** by `expo prebuild` — never hand-edit it (edits are wiped). Native config goes through `app.config.js` plugins.
8. **Gradle-layer failure → regenerate native** (`npx expo prebuild --clean -p android`). **Metro/npm resolution failure → reinstall `node_modules`.** Different layers; never cross the fixes.
9. **Clinical data lives in the DB** (Drizzle live queries), never in Zustand. Forms are RHF + zod, never `useState`.
10. **One sync seam** — features never call sync/API endpoints directly; go through repositories and `src/db/sync`.

## Where to look (read only what the task needs)

| Doing | Read |
|---|---|
| deps, versions, SDK, adding a native module | `ARCHITECTURE_RULES.md` §1–3, §5, §8 |
| adding/moving a file, or a new feature | `MOBILE_STACK.md` §2 + §9 |
| running the app, onboarding | `README.md` |
| monorepo-wide layout | `../../ARCHITECTURE.md` |

**Import & folder boundaries are enforced by eslint** (`.eslintrc.cjs`) — do **not** read `MOBILE_STACK.md` to answer "may X import Y". Run `npm run lint`; if it passes, you are compliant.

`src/` is currently **flat** (`components/ config/ db/ screens/ services/ stores/ …`). The `core/` + `features/` layout in `MOBILE_STACK.md` is a **roadmap, not the current state** — do not assume those folders exist.

Nothing else auto-loads. If a rule must outlive this session, put it in one of the docs above — not in chat.
