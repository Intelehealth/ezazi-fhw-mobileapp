# Restructure Plan — flat `src/` → feature-modular (`core/` + `features/`)

> **Status:** Phases 0-4 done · Phase 5 device smoke test OUTSTANDING · **Created:** 2026-09-10 · **Scope:** `apps/mobile/` only
>
> Executes the target layout in [`MOBILE_STACK.md`](MOBILE_STACK.md) §2, which is a **roadmap** until this
> plan completes. Behaviour must not change: this is `git mv` + import rewrites, with `tsc`,
> `eslint` and the jest suite as the net.
>
> **`apps/web` is untouched.** See the hard rule at the top of [`CLAUDE.md`](CLAUDE.md).

## Ground rules

- **One commit per phase.** Each phase ends green (`tsc` + `eslint` + `jest`) and is revertible on its own.
- **`git mv` always** — preserves file history through the move.
- **Co-located `__tests__/` move with their subject.** Never orphan a test from the code it covers.
- **The `@/` alias survives untouched.** It is declared in three places — `tsconfig.json` `paths`,
  `babel.config.js` `module-resolver`, `jest.config.js` `moduleNameMapper` — and all three map `@` → `./src`.
  Everything stays under `src/`, so only the sub-path after `@/` changes. **Do not edit those three configs.**
- **One hard-coded path escapes the alias:** `drizzle.config.ts` → `schema: './src/db/schema.ts'` (Phase 1g).
- **Stop Metro during Phase 1–3.** Large moves outrun Fast Refresh; restart with `-c` at Phase 5.

## Phase 0 — Close the six gaps in MOBILE_STACK §2  ☑ DONE

§2's tree has no home for six things that exist in `src/` today. Settled (2026-09-10):

| Orphan today | Home | Rationale |
|---|---|---|
| `services/storage/` (secure-store, config-storage) | `core/services/storage/` | Core infra; `core/api` depends on it. Extends §2's `core/services` list beyond livekit/socket/fcm/firebase. |
| `context/ThemeContext.tsx` | `core/ui/` | It is the design system's own provider. |
| `hooks/useResponsive.ts` | `core/ui/hooks/` | Layout hook — 13 inbound edges, all from UI. |
| `config/env.ts`, `config/theme.ts` | `core/config/` | 20+ inbound edges from screens/components. |
| `screens/home/HomeScreen.tsx` | `features/home/screens/` | Adds `home` to the §8 feature list (mirrors legacy `HomeActivity`). |
| `featureConfig.store.ts`, `config.api.ts`, `types/config.types.ts` | `core/config/` | App-wide remote config — consumed by navigation and multiple features, so not a feature. |

Also: `config/clients/*` moves to `core/config/clients/` **as-is**. Replacing it with `@ezazi/config` is a
separate open item (ARCHITECTURE_RULES §10) — do not conflate the two.
`types/process.d.ts` is ambient; leave it at `src/types/`.

**Deliverable:** MOBILE_STACK §2 updated with these six (new §2.1 records them; the tree now shows
`core/services/storage`, `core/ui/hooks`, `core/ui/ThemeContext.tsx`, `core/config`, `features/home`, and
`types/` as ambient-only). §8 gained a `HomeActivity → features/home` row. **No code moved.**

## Phase 1 — Build `core/`, most-depended-upon first  ☑ DONE

Order is derived from the real import graph: these folders are the *targets* of most edges, so moving
them first means each later phase rewrites its imports once instead of twice.

- ☑ **1a** `utils/` → `core/utils/`
- ☑ **1b** `config/` → `core/config/` (+ `types/config.types.ts`, `stores/featureConfig.store.ts`, `services/api/config.api.ts`)
- ☑ **1c** `i18n/` → `core/i18n/`
- ☑ **1d** `components/ui/`, `components/shared/`, `components/PermissionDeniedDialog.tsx`, `context/ThemeContext.tsx`, `hooks/useResponsive.ts` → `core/ui/`
- ☑ **1e** `services/storage/` → `core/services/storage/`
- ☑ **1f** `services/api/` → `core/api/`  *(already a thin adapter over `@ezazi/api-client`)*
- ☑ **1g** `db/` → `core/db/` — **also update `drizzle.config.ts`**
  - ☐ *Deferred:* splitting `schema.ts` into `core/db/schema/`. It is a refactor, not a move, and
    reshaping the file drizzle-kit reads risks a spurious migration against the on-device DB. Do it as
    its own change, alongside the FK/dirty-flag indexes and `relations()` already tracked in §7.

Green check after each sub-step.

**Two things Phase 1 taught — apply them in Phases 2–3:**

1. **`tsc` does not catch relative `require()` of static assets.** Four asset paths in
   `core/config/clients/*` broke silently (they escape `src/` with `../../../`) and only surfaced as a
   *jest* failure. `src/screens/auth/SplashScreen.tsx:19` has the same pattern and **will break when it
   moves in Phase 2** — it needs `../../../../` once it lands in `features/auth/screens/`.
   Always `grep -rn '\.\./\.\./\.\./' src/` after a move.
2. **Moving folders silently disables `boundaries`.** The `boundaries/elements` globs are literal paths;
   once `src/db/**` no longer matches anything, the policy that guards it cannot fire and eslint still
   exits 0. Phase 1 remapped the globs to `src/core/**` **in the same commit that moved the files**, and
   verified with a probe (a screen importing `@/core/db` must error). Do the same in Phases 2–3 — never
   leave a phase with enforcement silently off.

## Phase 2 — `features/auth`  ☑ DONE

The only feature complete enough to extract: 7 screens + 3 components + store + api.

- ☑ `screens/auth/*` → `features/auth/screens/`
- ☑ `components/auth/*` → `features/auth/components/`
- ☑ `stores/auth.store.ts` → **`core/session/`**, not `features/auth/stores/` — enforcing feature isolation exposed `HomeScreen` importing it, and navigation routes on its `status`. App-wide session state belongs in core (same reasoning as `featureConfig.store`).
- ☑ `core/api/auth.api.ts` → `features/auth/data/auth.api.ts`
- ☐ **NOT DONE — the known debt:** `SetupScreen.tsx` imports the data layer directly under a scoped
  `eslint-disable` + TODO (MOBILE_STACK §6). Moving `auth.api` into `features/auth/data/` behind a
  repository is exactly the prescribed fix — remove the disable in this phase. If it proves larger than
  expected, carry the disable forward and log it rather than stalling the phase.

## Phase 3 — `features/home` + navigation  ☑ DONE

- ☑ `screens/home/HomeScreen.tsx` → `features/home/screens/`
- ☑ `navigation/` stays put; only its imports change (it is the one layer allowed to import screens)

## Phase 4 — Rewrite the eslint boundaries  ☑ DONE

The payoff. `boundaries/elements` in `.eslintrc.cjs` is declared against the flat layout; it becomes
`core/*` + `features/*`.

- ☑ Redeclare `boundaries/elements` for the new layout
- ☑ **Flip feature isolation to `default: 'disallow'`** — you cannot enumerate every forbidden pair
  between N features; only an allowlist scales (a feature may import `core/*`, `@ezazi/*`, itself)
- ☑ Keep the three existing policies (presentation ↛ data, screens are leaf, data/services ↛ UI)
- ☑ This closes §6's "Not yet enforced: impossible until `src/` is restructured"

## Phase 5 — Verify + reconcile docs  ☐

- ☑ `npx tsc --noEmit` · `npx eslint "src/**/*.{ts,tsx}" App.tsx` · `npx jest` — all green, 116/116
- ☐ Metro `npx expo start --dev-client -c` from the **real `D:` path**, then device smoke test (auth flow)
- ☐ Docs that currently assert a flat `src/` and must flip:
  - ☑ `CLAUDE.md` — "`src/` is currently flat … roadmap, not the current state"
  - ☑ `MOBILE_STACK.md` §2 — drop the 🗺️ ROADMAP banner and the ⚠️ warning
  - ☑ `MOBILE_STACK.md` §6 — per-feature isolation is now enforced
  - ☑ `MOBILE_STACK.md` §7 — restructure row done
  - ☑ `ARCHITECTURE_RULES.md` §10 — remove the restructure from remaining build-out
  - ☑ `README.md` — source-layout tree

## Risk

Low but broad. Nothing changes runtime behaviour — moves plus import rewrites, caught by the type checker
and 116 tests. The real risk is a **half-finished phase**, which per-phase commits contain. The one thing
neither `tsc` nor jest can catch is a native/Metro resolution surprise, hence the device smoke test in
Phase 5.
