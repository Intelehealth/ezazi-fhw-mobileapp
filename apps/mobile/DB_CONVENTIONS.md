# `core/db` conventions

**Read this before writing anything under `src/core/db`, or anything that calls it.**

eslint enforces *who may import whom*. Everything in this document compiles, lints and typechecks
clean — it is the layer of correctness no tool can see. Most rules exist because the legacy Android
app got them wrong and we know what it cost.

Companion docs: `ARCHITECTURE_RULES.md` (§6 DB lifecycle) · `MOBILE_STACK.md` (layout).

---

## 1. The shape of a repository function

```ts
export function createPatient(uuid: string, input: PatientInput, on: DbHandle): void {
  on.insert(patient).values({ ...input, uuid, sync: SYNC_DIRTY }).run();
}
```

Five rules, all load-bearing:

**Synchronous — no `Promise`.** Both drivers are `BaseSQLiteDatabase<'sync', …>`; expo-sqlite runs
`stmt.executeSync()` underneath. A `Promise` return would be a fiction, and an `await` inside a
transaction callback breaks it (see §2).

**`on: DbHandle` last, and REQUIRED.** Never give it a `getDb()` default. With a default, omitting it
inside a transaction silently writes *outside* that transaction and compiles clean. Required makes it
`TS2554: Expected 3 arguments, but got 2`.

**Repositories never import `getDb`.** They reach the database only through the handle they are
given. If you find yourself importing it, the function is doing something it should not.

**Return rows, never payload shapes.** `Patient`, not `PatientDTO`. Push/pull field names belong to
the sync mapper — the repository must not know that `sync` is called `syncd` on the wire.

**Return `null` on a miss, never `''`.** The legacy returned empty strings, so a failed attribute-type
lookup wrote rows with a blank `person_attribute_type_uuid` instead of failing.

One file per entity under `repositories/`, mirroring `schema/` and `constants/`.

---

## 2. Transactions

```ts
transact((tx) => {
  insertAdmission({ ... }, tx);
  writeAdmissionObs(..., tx);   // same tx — both land, or neither does
}, db);
```

**The callback must be synchronous.** `transact` rejects an async callback at compile time
(`Type 'Promise<void>' is not assignable to type 'never'`). This is not a style preference: drizzle
runs `COMMIT` the moment the callback returns, so an async callback commits before its `await`s run,
a rejection never rolls back, **and the caller still receives the rejection** — the code believes it
failed while the data is on disk.

**Never `db.transaction(...)` directly.** Use `transact`, which carries the guard.

**Nest by passing the handle**: `transact(fn, tx)` issues a SAVEPOINT. A second `BEGIN` would throw.

**Parent before child.** Patient before patient attributes, visit before encounters, encounter before
obs. The legacy writes children first and survives only because there are no foreign keys; it breaks
the moment `foreign_keys = ON`.

---

## 3. Non-negotiables — breaking these corrupts clinical data

**Flip `sync` in the same statement that changes server-visible state.** Miss it and the change never
reaches OpenMRS. `closeVisit` sets `enddate` and `SYNC_DIRTY` together; anything new must too.

**Explicit column sets on conflict. Never a whole-row replace.**

```ts
.onConflictDoUpdate({ target: patient.uuid, set: values })   // yes
```

SQLite's `INSERT OR REPLACE` is DELETE+INSERT, so any column the server omitted reverts to its DDL
default. That is the legacy bug that un-voids a server-voided visit on **every re-sync**.

**Never overwrite `tbl_obs.comment`.** It is not a note. It holds an alert code — `'R'` severe,
`'Y'` warning, `''` — and is the **sole input to the risk score**. The legacy's
`markedAsVoidedObsToDb` stomps it, destroying whatever alert was there.

**No hard deletes. Anywhere.** Deletion is the `voided` flag. No repository gets a `delete()`.

**The 15 admission values are obs, not patient attributes** — bed number, admission date/time,
gravida, parity, LMP, EDD, labour onset, membrane rupture, risk factors, hospital, doctors.
Written as obs under `ENCOUNTER_ADMISSION`, read back through the obs repository. There is no
attribute fallback and no region branch. Four registration-only values stay attributes: registration
number, profile-image timestamp, alternate number, registration start time.

**Editing an obs means writing a new one.** Reads take the first row per concept ordered by
`created_date DESC`, so the latest wins and the previous value survives as history.

---

## 4. Database lifecycle

**`getDb()` is lazy and memoised. Never cache it in a module const.** The database must not exist for
a logged-out user; an eager open silently creates `localrecords.db` at import time. A cached handle
also survives logout pointing at a deleted file.

**Never call `db.close()` outside `teardown.ts`.** The legacy `getAllVisits` closes the shared handle
and breaks every call after it.

**`drizzle-kit generate` only — never `migrate` or `push`.** And do not regenerate casually:
`drizzle/` is bundled into the app and the journal is an identity contract with installed devices.
A new journal timestamp makes the migrator re-run 16 bare `CREATE TABLE`s against an existing
install, which throws — **every device needs `adb uninstall` first.**

**`openDatabaseSync(…, { enableChangeListener: true })` is mandatory**, or `useLiveQuery` never
updates and the UI just looks frozen.

---

## 5. Use what already exists

| Need | Use | Not |
|---|---|---|
| A row type | `typeof patient.$inferSelect` | a hand-written interface |
| An insert shape | `typeof patient.$inferInsert` | a hand-written interface |
| An OpenMRS uuid | `constants/{entity}.ts` | an inline literal |
| A `modified_date` | `localIsoTimestamp()` / `utcIsoTimestamp()` | `new Date().toISOString()` |
| An id | `newUuid()` from `core/db/uuid` | `expo-crypto` directly |
| A type name | the constant | a lookup in `tbl_uuid_dictionary` |

**Do not hand-write row types.** `$inferSelect` derives them from the schema; a parallel interface
drifts the moment a column changes.

**Resolve types by uuid constant, never by name.** `tbl_uuid_dictionary` is seeded on create only and
is staged for removal — a name lookup returns `''` on a miss and the caller silently no-ops.

**Two timestamp helpers, deliberately.** Patient and visit rows carry local time, encounter and obs
rows carry UTC. That split is the legacy's and both reach the server, so it is preserved. Match the
entity you are writing.

---

## 6. Compiles, lints, typechecks — and still does not work

**`db.query.x.findMany()` returns the query, not rows.** On a sync driver you must call `.sync()`.

**`useLiveQuery` is component-only.** In stores and the sync engine use `addDatabaseChangeListener`
on the raw handle. It can also miss `JOIN`/`with:` changes — prefer per-table queries.

**`z.guid()`, never `z.uuid()`.** zod v4's `uuid()` *rejects* OpenMRS uuids, so every uuid field
silently fails validation.

**Metro `sql` sourceExt + babel `inline-import` are load-bearing.** Drop either and release builds
ship an **empty database**.

---

## 7. Testing

**`createTestDb()` from `__tests__/helpers/testDb.ts`** gives a migrated in-memory database per test.
It applies the real shipped `drizzle/` bundle, so a test fails if the migrations drift from
`schema.ts`.

**Mutation-test the writes.** Break the rule the test claims to guard and confirm it fails. A guard
that cannot fail is decoration — this caught a real gap in the SOS dedupe tests, where the test
exercised a different code path from the guard it claimed to cover.

**Skip tests for single-column getters.** They restate the query and catch nothing.

**Run jest from `apps/mobile`, never the repo root.** The root has no jest config, so `npx jest`
there runs unconfigured across the whole monorepo — including `apps/web` and `packages/*`, which use
**vitest** — and produces a wall of parse errors that mean nothing.

Native modules cannot load in Node. `expo-crypto` is mocked globally in `jest.setup.js` via
`setupFilesAfterEnv` — **not** `setupFiles`, which the jest-expo preset owns and which breaks the RN
runtime if replaced.

---

## 8. What eslint does and does not cover

**Covers:** import boundaries — which layer may import which. Run `npm run lint`; if it passes, your
*placement* is compliant.

**Does not cover:** everything above. Placement is not correctness.

Two things are enforced by the type system rather than by eslint, and those cannot be forgotten:
a missing `DbHandle` argument, and an async `transact` callback. Everything else is on you.
