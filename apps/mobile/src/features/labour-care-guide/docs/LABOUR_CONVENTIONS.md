# Labour module conventions

**Read this before writing anything under `src/features/labour-care-guide`, `src/core/services/cardGeneration`,
`src/core/services/monitor`, `src/core/db/card.ts` or `modules/card-alarm`, or anything that calls them.**

This doc adds labour's own rules. It never restates the app-wide ones; it points to them. Order of precedence:

1. `apps/mobile/CLAUDE.md` tripwires and `ARCHITECTURE_RULES.md` (app-wide).
2. `DB_CONVENTIONS.md` for every database read and write.
3. `packages/clinical-rules/CLINICAL_RULES_CONVENTIONS.md` for every clinical rule.
4. This doc.

A rule here that seems to clash with one above is raised before coding, never resolved silently.
Why each rule exists is in its ADR (`adr/`); this doc says what to do and what it costs to get it wrong.

Companion docs: [`ARCHITECTURE.md`](ARCHITECTURE.md) · [`adr/`](adr/README.md) · `apps/mobile/LABOUR_OPEN_POINTS.md`.

---

## 1. Sources of truth

| Question | Decided by | Never by |
|---|---|---|
| What the app does: fields, options and their order, start values, required inputs, timings, flows, stored values | The Android app (`whitelabel-master`) | Figma, a guess, "what makes sense" |
| How it looks: colours, sizes, layout, navigation between screens | Figma (`Ezazi-Developer-File`) | Android's look |
| How the code is built | The app-wide docs and this doc | Habit from another project |

Values shown in Figma frames are samples, not data. Where Figma has no frame, propose a style built from theme
tokens and get it approved. ([ADR-0001](adr/0001-android-is-the-specification.md))

**A change from Android needs a recorded decision before code**, and applies only where it was named. Fixing an
Android bug somewhere else too is a second decision. A deviation is always written in three places: the decision
(open-points Settled row, or an ADR if it shapes the architecture), the deviation table of the area's README, and a
test that pins the new behaviour.

## 2. The shape of the module

```
screens/, components/    View       draws what a ViewModel gives it; no data access, no clinical logic
stores/use…ViewModel     ViewModel  reads through data/, re-reads on change, calls data/ to write, owns screen state
data/                    Model      the only labour code that touches core/db; every write in one transact
domain/                  Model      pure mapping; no IO, no clock (`now` is a parameter)
@ezazi/clinical-rules    Model      every clinical decision
```

**A screen never imports `core/db` or `data/`.** Enforced by eslint (boundaries). A screen that reads the database
cannot be tested without one and re-renders on the wrong signal.

**Clinical decisions come from the package, actions happen in `data/`.** The package returns a decision as plain data
(`decideSos`, `decideEndStage1`, `decideEndStage2`, `decideNextStep`, `buildNewCardObs`, `buildEditedCardObs`,
`computeVisitRisk`); the repository writes it. A clinical `if` in a store or a screen is a rule web will not get.

**No clinical data in zustand.** Saved data is in SQLite, form input in react-hook-form (CLAUDE.md tripwire 9).

## 3. Non-negotiables — breaking these corrupts clinical data

**Stored values stay byte-identical to Android.** Card names, concept uuids, obs values and comments, alert codes,
`REFER_TYPE` text, time formats. The server and the legacy app read the same rows; a changed spelling syncs clean and
is read as a different value. Labels on screen may change; stored values never.

**Every timer and stage-start card is written through `writeCard` (`core/db/card.ts`)**, the card engine's, the
stage starts' and the dev visit start's alike. It writes the encounter and its `ENCOUNTER_TYPE` marker obs together.
SOS cards are the one exception: `captureSos` writes the `LCG_SOS` encounter with its `SOS_STAGE_HOUR` label
(`DB_CONVENTIONS.md` §1). A third card writer drifts from these two, and a card without its marker reads differently
from Android's.

**A child row is written with its parent's sync flag, in the same transaction.** The push finds an obs through its
encounter and a visit attribute through its visit, so an obs written under an encounter that is not marked dirty is
never sent, and nothing fails. The sync branch's rule (`ARCHITECTURE_RULES.md` §9, 2026-11-16): once the sync work
is merged, every child write goes through `core/useCases` (`obsWrites`, `visitAttributeWrites`), never a repository
writer. Until then, `data/` and the card engine mark the parent themselves (open point 25: the missed marker does not
yet).

**One user action is one transaction.** Save, SOS, End Stage 1, End Stage 2 and each card-engine visit scan each run
in one `transact`. A half-written End Stage leaves a visit both open and completed.

**A visit is completed once.** `endStage1` / `endStage2` return `{ kind: 'alreadyCompleted' }` instead of writing a
second Visit Complete. Android can write two. ([ADR-0008](adr/0008-end-stage-as-android-with-bugs-fixed.md))

**A card name is written once per visit.** The card engine checks for an existing, non-voided card of the same name
before writing (Android's `isEncounterAlreadyAvailable`, plus the voided filter Android lacks).

**No clinical value in app code.** Ranges, steps, option lists, start values, field ids, card names and alert rules
come from `@ezazi/clinical-rules`; uuids from `core/db/constants`. A literal in a component is a rule only mobile has.

**The package changes only additively.** It is shared with web. Adding an export is fine; changing or removing one is
a decision for the team, not a side effect of a labour task.

## 4. Time, text and constants

**"Now" is read once, at the edge, and passed down.** Use `nowMs()` from `core/utils/datetime.ts` in stores, the card
engine and the battery guard; pass `now` into `domain/` and the package. Never `Date.now()` in labour or the card
services: a second clock read inside one action gives a card two different times. ([ADR-0011](adr/0011-code-rules-for-text-time-and-constants.md))

**Store and show dates through the shared pair.** `datetime.ts` for storage, conversion and arithmetic (encounter and obs
in UTC, patient and visit rows in local time, as `DB_CONVENTIONS.md` says); `calendar.ts` for display. Timeline card
dates are Gregorian for now. eslint blocks the date libraries anywhere else. ([ADR-0010](adr/0010-dates.md))

**Every text a person can read is in `en.json`** — screens, dialogs, toasts, notification titles, channel names, and
the native scan service's texts (passed in with `cardAlarm.setTexts`). Hindi and Nepali show English until the team
provides translations. A hard-coded string is a string that can never be translated.

**Forms are react-hook-form + zod**, with the schema built from the package's save rules (`captureForm.schema.ts`,
`MedicineForm`). A hand-written check in `useState` is a check the package does not know about.

**Android's text rules come from the package:** `javaTrim` (Java's `trim`, which differs from JavaScript's), the digit
filter `filterDigits`, `FIELD_ID` constants. Re-implementing one is how RN and Android start storing different text.

## 5. Compiles, lints, typechecks — and still does not work

**A card marked Missed while its capture screen was open.** The next card fell due and the engine wrote the missed
marker. `saveCard` voids that marker when data is saved, so the data wins. A new save path that skips this leaves a
card showing Missed with data in it.

**Doctor rows on a card.** Rows written by `Organizational: Doctor` belong to the card but are not the nurse's.
`readStoredCardObs` reads through `obsRepo.listByEncounterExcludingDoctors`; reading with the plain query makes an
edit rewrite a doctor's row.

**Edits rewrite rows in place, as Android.** An edited value keeps its row uuid; `created_date` is kept per row. An
edited medicine becomes a new row and the old one stays live; that is Android's behaviour, recorded as open point 2,
and is not "fixed" without a decision. ([ADR-0006](adr/0006-edits-rewrite-rows-in-place.md))

**Decision Pending visits arm no alarm.** A visit waiting for a decision has no next card; arming for it would ring
for a moment that is always already past.

**A stage change must re-arm the alarms.** After Start Stage 2 or a completed visit, the ViewModel calls
`scanAndRearm`; without it the alarm stays set for the old stage's next card.

**The card's time is the scan moment.** The wake-up waits for the due second, so the scan moment is the due time.
Writing a computed due time instead would diverge from Android on every late wake.

**`android/` is generated** (CLAUDE.md tripwire 7). Native code for labour lives in `modules/card-alarm` and reaches
the build through its config plugin.

## 6. Use what already exists

| Need | Use |
|---|---|
| Write a card | `writeCard` (`core/db/card.ts`) |
| Save a captured card | `saveCard` (`data/labourRepository.ts`) |
| SOS, End Stage 1, End Stage 2 | `captureSos`, `endStage1`, `endStage2` (same file) |
| A card's stored obs for editing | `readStoredCardObs` |
| Write an obs or a visit attribute | After the sync merge: `core/useCases` (`recordObs`, `recordMissedEncounter`, `editObs`, `voidObs`, `upsertVisitAttribute`, `markVisitRead`). Before it: the repository writer **plus** the parent's `markDirty` |
| Run several writes atomically | `transact` (`core/db/tx`) |
| The current time | `nowMs()`; formatting through `datetime.ts` / `calendar.ts` |
| Re-arm after a stage change | `scanAndRearm` (`core/services/monitor`) |
| Who is writing | `WriterIdentity` (`core/session/writerIdentity.ts`) |
| Buttons, choices, steppers, pickers, dialogs | `core/ui`: `AppButton`, `ChoiceButton`, `StepperInput`, `PickerField`, `ConfirmDialog` |
| A clinical rule | `@ezazi/clinical-rules`; if it is missing, add it there (additively) |

## 7. Recording a decision

| Kind | Where |
|---|---|
| An open question | `LABOUR_OPEN_POINTS.md`, "Waiting for a decision", with what RN does today |
| A settled detail (a label, one behaviour) | `LABOUR_OPEN_POINTS.md`, Settled row: date, decision, who |
| A decision that shapes the architecture, a data format, or a rule many files follow | A new ADR in `adr/` |
| A decision that replaces an earlier one | A new ADR marked "Supersedes"; the old one is marked "Superseded by", never edited away |
| A new rule everyone must follow | This doc, with its reason and cost; plus an eslint rule when a tool can catch it |

Every decision has a date and who decided (a role, not a person's name). A decision taken in chat that is not written here does not exist.

## 8. Testing

- **Every write path** (`data/`, the card engine) is tested on `createTestDb()` against the real migrations
  (`DB_CONVENTIONS.md` §7).
- **Every Android parity point** has a test that names the Android file it follows, so a later change has to break a
  named test.
- **Mutation-test a guard** (the duplicate-card check, "completed once", voiding the missed marker): break it and see
  the test fail.
- **Card timing is proven on a device**, not in jest: the wake log (`Android/data/org.intelehealth.ezazi/files/card-wakes.log`)
  shows due time against scan time.
- **Every screen is checked on an xhdpi phone, a Samsung 8.7" tablet and a Samsung 11" tablet.**

## 9. What tools enforce

| Rule | Enforced by |
|---|---|
| Screens and components never import `core/db` or `data/` | eslint boundaries |
| A feature imports only its own folder, `core/*` and `@ezazi/*` | eslint boundaries |
| Date libraries only in `datetime.ts` / `calendar.ts` | eslint `no-restricted-imports` |
| No raw uuid literal outside `core/db/constants` | eslint `no-restricted-syntax` |
| `transact`, never `.transaction(` | eslint `no-restricted-syntax` |
| `Date.now()` outside `datetime.ts`, hard-coded user text, raw sizes, a second card writer | **Not enforced yet.** Review only, until the labour lint rules land |
| A child row written without its parent's sync flag | **Not enforced.** Review only; after the sync merge, by routing every child write through `core/useCases` |
