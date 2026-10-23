# `@ezazi/clinical-rules` conventions

**Read this before writing anything under `packages/clinical-rules`, or anything that calls it.**

Companion docs: `README.md` · `apps/mobile/ARCHITECTURE_RULES.md` §7a, §9 · `apps/mobile/DB_CONVENTIONS.md`.

---

## 1. The shape of a rule

- **Pure:** same input, same output.
- **No** database, network, storage, UI or globals.
- **`now: number` (epoch ms) is a parameter**, last and required. Never read the clock.
- **Return a decision as plain data** (`{ kind: … }`). The app performs it.
- **Inputs are stored values** (names, times, obs values), never app row types.
- **Return a `kind` or `null`** for data an app may legitimately hold.
- **Throw only for programmer errors.**
- **Layout:** one folder per area; tests in `__tests__/` beside the code.

## 2. Android is the specification

- Every rule matches Android production, with its source cited.
- Any difference is a deviation: a README row plus a test.
- Android behaviour changes only through a recorded decision (date, who).

## 3. Non-negotiables

- Stored values stay byte-identical to Android. Labels may change; stored values never.
- No uuids: use names and constant keys; apps resolve uuids.
- No clinical value is written in an app.
- The same rules apply to every client; only range min/max may differ, through a profile (§7a).
- Never read `@ezazi/config`; the app passes the profile id.
- Exported data is deep-frozen with `deepFreeze`, constants included.

## 4. One place for every name and number

- **Names live in `src/constants/` only.** This covers field, input, section and stage ids; concept keys; card name parts; stored marker values; and translation keys. Reference the constant; never retype the string, not even as an object key.
- **Option values live with their field** in the field data, in Android order. Never repeat one elsewhere.
- **Range and limit numbers live in `src/ranges/` only.** Min/max go in `baseRanges.ts`; keystroke limits go in `inputLimits.ts`.
- **Card schedule numbers live in `cards/schedule.ts` only** (hours, cards per hour, interval).
- A new field gets its id, concept key and limits added there first.
- Build card names and translation keys with the helpers, never by hand.
- `constants/__tests__/centralNames.test.ts` fails on any name written outside `constants/`.

## 5. Data and logic

- Data files hold plain data only (`as const satisfies …`), in Android order.
- Logic files hold small functions over that data, never a second copy of it.
- A rule change is a data change wherever possible.
- Labels are i18n keys; never compare or store a label.

## 6. Use what already exists

| Need | Use | Not |
|---|---|---|
| The current time | a `now` parameter | `Date.now()`, `new Date()` |
| Stored times | `parseUtcTimestamp` / `formatUtcTimestamp` | `new Date(text)`, a date library |
| Stored text formats | the `encode…` / `decode…` helpers | `JSON.stringify`, concatenation |
| Trimming stored text | `javaTrim` | `String.prototype.trim` |
| Ranges | `getRangeFor(profile, id)` | number literals |
| Input limits | `INPUT_LIMITS[id]`, `INFUSION_INPUT_LIMITS[id]` | number literals |
| Names | `FIELD_ID`, `SECTION_ID`, `STAGE`, … | string literals |
| Immutable data | `deepFreeze` | `Object.freeze` |

## 7. For apps calling the package

- Import from the package root only.
- Pass inputs exactly as the README defines them.
- Repeat-safety is the app's job: write only what changed.
- Store each decision in one `transact`, parent before child.
- Map the client to a range profile in one place.

## 8. Testing

- Test against Android (a port of its code, or a literal Android table), not against the package's own data.
- Mutation-test every rule: break it, and a test or the typecheck must fail.
- Cover boundaries, invalid and legacy input, and every deviation.
- Tests may use real dates; they may never import an app.
- Run: `npx tsc --noEmit && npx eslint "src/**/*.ts" && npx vitest run`.

## 9. What eslint and the type system cover

**eslint** (package source):
- no app imports;
- no UI or Expo modules, database or HTTP clients, `@ezazi/config`, or Node built-ins;
- no uuid or OpenMRS id literals;
- no clock;
- no runtime globals;
- no `enum`.

**Mobile:** import the package from its root only.

**Tests:** names outside `constants/`.

**Types:** unknown range ids or keys in a profile; unknown field keys or values; unhandled union members.

**Everything else is still on you:** matching Android, byte-identical stored values, and documented deviations.
