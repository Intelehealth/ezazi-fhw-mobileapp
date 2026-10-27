# `@ezazi/clinical-rules`

Clinical rules of the eZAZI / eLCG labour-monitoring app, shared by the mobile app and the web app.
Ported from the Android app in production (`elcg-fhw-mobileapp` @ `ezazi_sprint_47_whitelabel_master`, `8185b00`).

## Ground rules

- **Pure functions only.** No database, no network, no React / React Native / DOM, no Node built-ins, no runtime dependencies.
- **No clock.** Every time-based function takes `now` (epoch ms) as a parameter.
- **No uuids.**
  - Cards are identified by their encounter type **name** (`'Stage1_Hour1_1'`).
  - Fields name their concept by the app's **constant name** (`conceptKey: 'BASELINE_FHR'`).
  - Each app resolves uuids from its own constants (mobile: `core/db/constants/`).
- **Returns plain data.** `decideNextStep` says "create card X"; the app decides how to store it.
- **Same for every client, with one exception:** only the min/max of a validation range may differ per client, through named **range profiles** in this package (ARCHITECTURE_RULES §7a). The package never reads `@ezazi/config`; the app passes the profile id.
- **One public API:** import from `@ezazi/clinical-rules` only, never from an internal file.

### Enforced by eslint

| Where | Rule |
|---|---|
| This package's source (root `.eslintrc.cjs`) | No import of an app, React / React Native / Expo, drizzle / axios / `@ezazi/api-client`, `@ezazi/config`, or Node built-ins. No uuid or OpenMRS concept id (`5090AAAA…`) literal, including in template strings. No `Date.now()` / `new Date()` without an argument. No `fetch`, `window`, `performance`, `process` and similar globals. No `enum` |
| Its tests | The "no app import" rule only |
| `apps/mobile` | Import `@ezazi/clinical-rules` from the root only |

## Card generation (Stage 1 and Stage 2)

| Stage | Cards | Gap | Last card | Decision Pending |
|---|---|---|---|---|
| `stage1` | 30: `Stage1_Hour1_1` … `Stage1_Hour15_2` | 30 min | `Stage1_Hour15_2` (at 870 min) | 900 min (15 h) |
| `stage2` | 20: `Stage2_Hour1_1` … `Stage2_Hour5_4` | 15 min | `Stage2_Hour5_4` (at 285 min) | 300 min (5 h) |

| Function | Use |
|---|---|
| `decideNextStep(latestCard, now)` | The 1-minute timer decision for one visit: `createCard`, `markDecisionPending`, `preSync`, `wait`, `notMonitored` or `invalidTime` |
| `getUpcomingStep(latestCard)` | The next card (or Decision Pending) and when it is due, for countdowns |
| `getStageStart(stage, now)` | What starting Stage 1 or Stage 2 writes |
| `findCard`, `getNextCard`, `getFirstCard`, `getStageCards`, `getStageWindowMinutes` | Card table lookups |
| `parseUtcTimestamp`, `formatUtcTimestamp`, `wholeMinutesBetween` | The card clock: `yyyy-MM-dd HH:mm:ss` UTC |

**`latestCard`** is `{ name, encounterTime }` of Android's "latest card":
- the visit's newest **non-voided** encounter, excluding `VISIT_COMPLETE`, `LCG_SOS` and `ENCOUNTER_ADMISSION` (`EncounterDAO.getEncounterByVisitUUIDLimit1`; mobile: `encounter.findLatestClinicalByVisit`);
- any other name (for example `DELIVERY_OUTCOME_STAGE3`, a visit note) returns `notMonitored`.

**Rules reproduced** (`CardGenerationEngine.java` 111–146, 275–285, 322–352, 390–400; tested against a port of that code on every card, every second from −3 to +40 minutes):
- **When the next card is due.** Minutes since the latest card are whole minutes, truncated toward zero. At the gap (30 / 15) the next card is due, timed **now**; one minute before (29 / 14), `preSync`.
- **No backfill.** Each card counts from the previous card's real time, so a late tick yields one card.
- **End of a stage.** After the stage's last card: `markDecisionPending` with `'true'`, **on every later tick**. Android skips the write when the value is already `'true'` (`CardGenerationEngine` 290–291), so the app must too. The timer never moves a visit from Stage 1 to Stage 2.
- **What a card carries.** A timer card carries the `NORMAL` marker (the `ENCOUNTER_TYPE` obs) and `privacynotice_value` `'true'`. Stage 2's first card has both; Stage 1's first card has the marker but no privacy value (see the deviation below).
- **Stage starts** come from user actions:
  - Stage 1 on admission, and only for a new visit;
  - Stage 2 on "End Stage 1".

  Both leave Decision Pending `'false'`. Android skips that write when it is already `'false'`.

**Deviations from Android:**

| Android | Here | Why |
|---|---|---|
| An unreadable card time counts as "now", so the visit silently never advances | `invalidTime` | The caller can log it; the effect is still "no card" |
| Lenient time parser: also reads trailing text (`+0530`, `Z`), extra spaces, single-digit fields, and rolls over impossible dates (`02-30`) | Exact shape only, plus an ignored fractional-seconds suffix (`.0`) and native digits | Every writer (Android, the RN app, the server pull) uses the exact shape (mobile `core/utils/datetime.ts`) |
| Card name matched with `toLowerCase().contains("stage1")` | Exact name from the card table | Names come from the app's constants |
| A `hour ≥ 21 → Stage 2` branch | Not ported | Unreachable: Stage 1's limit card is `Stage1_Hour15_2`, so hour 16 is never generated |
| A card type missing from the device's uuid table is silently skipped | Always returns the card | Mobile resolves names from constants, which hold all 58 cards |
| Times are formatted in the device language, so a Marathi, Bengali or Assamese phone may write native digits (`२०२६-…`) | Always English digits (`2026-…`); native digits are still read | Data in the DB is English only (decided 2026-10-15, Kaveri) |
| Stage 1's first card has no `NORMAL` marker (`AdmissionWriter`, Nepal's `PatientDetailActivity`) | `getStageStart('stage1')` gives the marker too; SOS cards are unchanged | Marked like the timer cards (decided 2026-10-27, Kaveri). Android's e-partogram shows `ENCOUNTER_TYPE` in row 24, so that card's column now shows `NORMAL` like the rest |

## Card status on the timeline

`getCardStatus(card, visit)` gives each card's `state` (`pending` / `submitted` / `missed`), its `access` (`write` / `edit` / `read` / `none`), whether the edit icon shows, and whether the card engine must write the missed marker. It follows Android's `TimelineAdapter.onBindViewHolder` (whitelabel-master `b3ddd15`):

- Only the newest card (SOS cards included) is open, and not during Decision Pending: empty it is `pending` / `write`; filled it is `submitted` / `edit`.
- Every other card is `submitted` / `read` when it has real obs (anything but the card marker, SOS label and missed marker), otherwise `missed`, and gets the missed marker once.
- A completed visit, or a provider who does not hold the visit, opens nothing and shows no edit icon.

The app passes plain facts (newest or not, has real obs, has the marker, Decision Pending, visit complete, visit holder). "Upcoming" is not a stored card: show it with `getUpcomingStep`.

**Deviations from Android:**
- **The missed marker is written by the card engine, for every stage** (decided 2026-10-23, Kaveri). Android writes it while drawing the timeline.
- **Android's `isNewEncounterCreated` screen flag is not ported** (Kaveri, confirmed 2026-10-27). It makes the newest filled card read-only until the timeline screen is reopened after a timer-created card; here the newest filled card stays editable.

## SOS cards (Stages 1, 2 and 4, one shared rule)

From `TimelineVisitSummaryActivity.collectEmergencyData` (1440–1544), the SOS button (1590–1596, 1691), `EncounterDAO.getSosEncounterByVisitUUIDLimit1`, `ObsDAO.getLatestSosObsByEncounterUuid`, `EncounterTypeResolver.kt` and `TimelineAdapter.nextIntent` (357–367). Tested against a port of that code.

| Function | Use |
|---|---|
| `decideSos(request, now)` | The SOS tap: `createSos` (label, time, provider and privacy notice to write) or `blocked` with a reason |
| `formatSosLabel`, `parseSosLabel`, `parseCardStageHour`, `stageDigit` | The `SOS_STAGE_HOUR` label `Stage{X}_Hour{Y}_SOS{n}` |
| `getSosCardStage(label)` | The stage an SOS card opens in (Stage 1 when the label is missing, as Android) |
| `resolveEncounterKind(value)` | `NORMAL` or `SOS` from a card's ENCOUNTER_TYPE / SOS_STAGE_HOUR value |

**`request`:**
- `visitCompleted`, `isVisitHolder` and `decisionPending` (DECISION_PENDING is `'true'`);
- `latestCard`: Android's "latest card", the same query as the timer, with its `providerUuid` and `privacyNoticeValue`;
- `latestSosLabel`: the `SOS_STAGE_HOUR` value of the newest non-voided `LCG_SOS` encounter.

**Rules reproduced:**
- **When it's blocked.** Blocked on a completed visit (Android hides the button) and for a nurse who doesn't hold the visit (button disabled). Nothing happens when there's no latest card or its name is not a stage card (Android returns silently).
- **Deviation, blocked during Decision Pending** (decided 2026-10-15, Kaveri: no activity after Decision Pending). Android allows it, and the SOS card is "missed" at once.
- **No count limit.**
- **The label.**
  - X and Y come from the latest card's stage digit and hour. Stage 4 keeps Android's digit **3** (`Stage3_Hour2_SOS1`), because the server, web and print read it.
  - n is the previous SOS's n + 1 when it has the same stage and hour, otherwise 1 (also when the previous label is missing or unreadable).
- **What gets written.** An `LCG_SOS` encounter timed now (UTC, no ms), with **provider and privacy notice copied from the latest card**, as Android does. Plus one `SOS_STAGE_HOUR` obs = label (creator = user, no comment). **No** `ENCOUNTER_TYPE` obs.
- **Write order (mobile).** The encounter first, then the obs with that encounter's uuid, in one `transact` (parent before child, `DB_CONVENTIONS.md` §2). Android writes the two separately.
- **SOS cards and the timer.** An SOS card is ignored by the timer (excluded from "latest card") and shows every field of its stage (`getSosLayout`).

**Decided (2026-10-15), keep Android:** when an SOS is created, the card that was newest on the timeline (normal or SOS) is no longer the newest, so it can no longer be filled. If it has no captured values it is marked **Missed** (`MISSED_ENCOUNTER` obs); a card with data stays **Submitted**. Either way it is not editable after that. `getCardStatus` decides this; the mobile card engine writes the Missed marker.

**Kept for parity, to be checked:** the provider is copied from the previous card rather than taken from the logged-in nurse (open question SOS3, `apps/mobile/.notes/OPEN_QUESTIONS.md`, local notes).

**Malformed labels, not reproduced** (decided 2026-10-15; no writer produces them): a trailing `_` (`Stage1_Hour3_SOS2_`), a card name whose last part is not a number (`Stage1_Hour3_x`), a stage digit missing (`Stage_Hour1_SOS1`) and an index too large for a Java `int`.

## Partogram fields (Stage 1 and Stage 2)

From `PartogramConstants.getSectionParamInfoMasterMap` (120–481) and `PartogramDataCaptureActivity` (field filters 1016–1167, saving 420–911).

- **26 fields in 6 sections**, in Android order: Supportive care 4 · Baby 6 · Woman 6 · Labour Progress 4 · Medication Administration 3 · Shared Decision Making 3. Data: `STAGE1_AND_2_FIELDS`, `STAGE1_AND_2_SECTIONS`.
- **Each field holds:**
  - `id` and `conceptKey`;
  - `labelKey` (i18n) + `androidLabel` (Android's English text);
  - `input` (type and Android's input limits);
  - option `value`s exactly as Android stores them;
  - `storage`;
  - `frequency` per stage;
  - `androidSource`.
- **Which card shows which field:** `getCardLayout(cardName)` for a regular card and `getSosLayout(stage)` for an SOS card (every field). Both return `{ stage, sections }`, empty sections left out, so a screen builds its tabs from it. The 4-hourly exam cards are `EXAM_CARD_NAMES` (Android `checkFiveHourField`).
- **Stage-specific options:** Cervix is `10…5` in Stage 1 and `P` (Pushing) / `10` in Stage 2 (`getFieldOptions(field, stage)`).
- **Oxytocin and IV Fluids inputs:**
  - status options, IV fluid types ("Other IV Fluid*" is a text box stored as type `Other` + `otherType`) and sub-input labels: `INFUSION_*`; their limits are in `INFUSION_INPUT_LIMITS`;
  - both open with Yes/No, defaulting to No. **Medicine does too**, so a Save writes `"No"` for all three once their section is shown; an empty card may be saved.
- **Free text** (Supervisor Doctor, IV "Other"): Android keeps only ASCII letters, digits, punctuation and space, and upper-cases the first letter: `filterFreeText`.
  - **Deviation, Android bug not ported** (decided 2026-10-15, Kaveri): once Supervisor Doctor's text ends in `.`, Android limits the box to 4 characters (`Dr. Rao` saves as `Dr.`).
  - Android capitalises only text typed at the very start; `filterFreeText` capitalises the first character of the whole text.

**Concepts:** every field's `conceptKey` is the name of a constant in `apps/mobile/src/core/db/constants/obs.ts`; a mobile test fails if one is missing.

**Deviation:** Android also uses the card's encounter type when choosing fields. A regular card carrying a legacy `"SOS"` type would show every field. Here, a regular card always uses `getCardLayout` and an SOS card `getSosLayout`. This only differs for legacy or malformed rows. **Decision pending (Kaveri, 2026-10-27): kept as is until decided.**

## Saving format (same as Android)

| `storage` | Fields | Android writes | `comment` |
|---|---|---|---|
| `value` | 21 fields (selects, numbers, Supervisor Doctor) | One obs with the option value / typed value. Skipped when empty on a new card; **on an edited card a cleared value is saved as an empty value** | Alert code (`'G'` / `'R'`, `''` when empty), as Android's `getAlertNameUpdated`. Decided 2026-10-23; DB_CONVENTIONS updated to match |
| `infusion` | Oxytocin, IV Fluids | `"No"` (`NO_RESPONSE_VALUE`) when No; otherwise one obs with Gson JSON (`encodeInfusion`) | none |
| `medicineList` | Medicine | `"No"` when No; otherwise one obs per medicine, `Form \| Name \| … ` (`encodeMedicine`) | `''` |
| `noteList` | Assessment, Plan | One obs per note, the note text | none |

- **Infusion JSON key order:** Gson writes keys in the order Android's runtime (ART) lists the class's fields, which is by field name: `infusionRate, infusionStatus, otherType, strength, type`. Gson also drops nulls and HTML-escapes `< > & = '`.
  - **This order is inferred from how ART works. Confirm it with one real stored Oxytocin or IV value from a device or the server.**
  - Reading (`decodeInfusion`) accepts any key order, and numbers.
  - Not reproduced (malformed, never written; decided 2026-10-15): Gson's lenient reading of single-quoted or unquoted JSON, and keeping a number's exact text (`20.0` reads as `"20"`). `isNoResponse` also trims, where Android does not.
- **Trimming:** text is trimmed like Java `String.trim()` (no Unicode spaces).

### Building the obs to save

- `buildNewCardObs(input, notes)`: the obs Android's `saveObs` writes for a new card, in field order. A filled value gets its alert code in `comment`; "No" or the infusion JSON for Oxytocin and IV Fluids; "No" or one obs per medicine; one obs per note. Empty values write nothing; non-value rows leave `comment` null, as Android.
- `buildEditedCardObs(stored, input, notes)`: re-saving a card the write-new way (DB_CONVENTIONS, decided 2026-10-23). It returns obs to insert and obs uuids to void, with the same end result as Android's EDIT save read newest-first: a changed value is a new obs (a cleared one is saved empty), an unchanged value writes nothing, a Yes after "No" voids the stale "No", the same infusion JSON is never written twice, removed medicines are voided, and notes are only added.

Each draft carries the field's `conceptKey`; the app resolves it to the concept uuid and adds the encounter, creator and time in one `transact`.

**Deviation:** Android updates an edited obs in place (and voids by uuid); here every change is a new obs and the newest wins (DB_CONVENTIONS write-new). **Decision pending (Kaveri, 2026-10-27): kept as is until decided.**

## Validation ranges (per client)

| Range | Android | Checked |
|---|---|---|
| Baseline FHR | 90–220 bpm | on Save |
| Pulse | 30–250 bpm | on Save |
| Systolic BP | 30–300 mmHg | on Save |
| Diastolic BP | 20–180 mmHg, and below systolic; **only when systolic is also filled** | on Save |
| Temperature | 89.6–109.0 °F | on Save |
| Duration of contractions | 0–100 s | on Save |
| Oxytocin strength | 1–10 U/L | **while typing only**: the value is cleared. Save only checks it is not empty |
| Infusion rate | 5–60 drops/min | while typing and on Save |

- **Profiles:** `RANGE_PROFILES` has one profile per client (`default`, `nepal`). Both are empty today, so every client uses Android's values.
- **Which profile:** the app passes it. Mobile uses `RANGE_PROFILE` from `src/core/config/rangeProfile.ts`, which follows the build client automatically.
- **One place for numbers:** every min/max is in `ranges/baseRanges.ts`, every keystroke limit in `ranges/inputLimits.ts` (`INPUT_LIMITS` for fields, `INFUSION_INPUT_LIMITS` for the Oxytocin and IV Fluids inputs). Change a value there and every field and rule follows.
- **Reading a range:** `getRangeFor(profile, fieldOrInputId)` (null when it has none), `getValidationRanges(profile)`, `getValidationRange(profile, id)`.
- **Guard rails (types and tests):** a profile can only name known ranges, can only change min/max, and must keep `0 ≤ min < max` within the field's input box and decimals.

## Validation rules (Stage 1 and Stage 2)

From `PartogramDataCaptureActivity.saveObs` (711-733), `ValidatePartogramFields`, `Medication`, `ParamInfo` and `PartogramQueryListingAdapter`. Every field is optional; a value is checked only when filled. Ranges come from the client's profile.

**On Save:** `getCardErrors(input, profile)` returns every error in Android's order (Android shows only the first). Each error has `id`, `reason`, `range` (for the message's min/max) and `messageKey`.

| Order | Field | Rule | `reason` |
|---|---|---|---|
| 1 | Oxytocin | After Yes: strength, rate and status filled; rate in range | `infusionIncomplete` |
| 2 | IV Fluids | After Yes: type, rate and status filled; rate in range | `infusionIncomplete` |
| 3 | Medicine | After Yes: at least one medicine | `medicineMissing` |
| 4–6 | Baseline FHR, Pulse, Systolic BP | In range | `outOfRange`, `notANumber` |
| 7 | Diastolic BP | Only when systolic is also filled: in range, then below systolic | `outOfRange`, `notBelowSystolic` |
| 8–9 | Temperature, Duration of contractions | In range | `outOfRange`, `notANumber` |

Contractions per 10 min has no Save check (only its 1-digit input limit).

**While typing:**

| Function | Android |
|---|---|
| `checkDiastolicTyping(systolic, diastolic)` | Clears diastolic when systolic is empty (`enterSystolicFirst`) or not above it (`notBelowSystolic`) |
| `systolicClearsDiastolic(systolic, diastolic)` | `true` when a filled diastolic is above the new systolic: clear it, silently |
| `checkStrengthTyping(text, profile)` | Oxytocin strength out of range is cleared; `"1."` is `pending` |
| `checkInfusionRateTyping(text, profile)` | Below min: `warn`, kept. Above max: cleared |
| `checkInfusionRateOnBlur(text, profile)` | Still below min when the box loses focus: cleared |

A medicine needs `MEDICINE_REQUIRED_FIELDS` before it can be added (Android `NewMedicineFragment`).

**Deviation:** Android crashes on text that is not a number in a number box; here it is `notANumber`. The input limits make it unreachable in practice.

## Add Medicine form

The form shows all ten parts Android's `NewMedicineFragment` has (decided 2026-10-23); the six in `MEDICINE_REQUIRED_FIELDS` must be filled before a medicine can be added.

- `MEDICINE_CATALOGUE`: the 39 `assets/medicines.json` entries. The name dropdown lists `catalogueLabel(entry)` ("Tablet Paracetamol 650 mg"); `findCatalogueMedicine(text)` returns the picked entry so the app fills form, name, strength, dose unit and route. A name typed by hand returns null.
- `MEDICINE_FORM_OPTIONS`, `MEDICINE_STRENGTH_OPTIONS`, `MEDICINE_DOSE_UNIT_OPTIONS`, `MEDICINE_ROUTE_OPTIONS`, `MEDICINE_FREQUENCY_OPTIONS`, `MEDICINE_DURATION_UNIT_OPTIONS`: Android's `arrays_ezazi.xml` lists, copied exactly, duplicates and spellings included. Each value is both shown and stored, and a value may also be typed.

## Controls and steppers

`getFieldControl(fieldId)` says which control a field is entered with, so both apps show the same choice (Figma "Observation flow", decided 2026-10-23): `segmented` for up to four options, `chips` for Cervix and Descent, `picker` for six options, `stepper` for numbers, and `infusion`, `medicineList`, `noteList`, `text` for the rest. The control never changes what is stored.

`getStepperSpec(id, profile)` gives a stepper's `min`, `max`, `base`, `step` and `fractionDigits`. Android had no steppers, so nothing new is invented: min and max are the client's validation range (or the keystroke limit where Android has no range, Contractions 0–9), the base the first + fills is the lowest valid value that is not an alert (FHR 110, Pulse 60, Systolic 80, Temperature 95, Contractions 3, Duration 20), and `STEPPER_STEPS` is 1, 0.1 for temperature and 5 for the infusion rate.

## Alert codes (Stage 1 and Stage 2)

`getAlertCode(fieldId, value)` gives the `obs.comment` code for one value field, as Android's `PartogramAlertEngine.getAlertNameUpdated` (whitelabel-master `b3ddd15`):

- `ALERT_CODE.NONE` (`''`) when the value is empty;
- `ALERT_CODE.RED` (`'R'`) for an option marked `alert` in the field data, or a number past its `ALERT_THRESHOLDS` entry (Android's exact `<`, `<=`, `>`, `>=`);
- `ALERT_CODE.GREEN` (`'G'`) for any other value, including fields Android never codes red (Cervix, Descent, Supervisor Doctor).

Options match ignoring case, as Java `equalsIgnoreCase`. Thresholds are the same for every client; they are not part of a range profile. Infusion, medicine and note rows are never coded: the app leaves their `comment` null, as Android does.

**Deviations from Android:**
- **Amniotic fluid is coded** (decided 2026-10-23, Kaveri): `M+++` and `B` are `'R'`, the others `'G'`. Android's rule is keyed on "Amniotic fluid meconium" but the field is named "Amniotic Fluid", so on Android it is always `'G'`.
- **Text that is not a number is `'G'`.** Android throws `NumberFormatException`; the input limits make it unreachable in practice.

## End Stage 1

`STAGE1_OUTCOMES` lists Android's six choices in dialog order. `decideEndStage1(outcome, details, now)` returns what one choice writes (Android `ReferTypeHelper`, `VisitCompletionHelper`):

- **Move to Stage 2** → `startStage2` with `getStageStart('stage2')`: Stage 2's first card, NORMAL marker, Decision Pending cleared.
- **Refer to other Hospital, Self discharge, Shift to C-Section, Refer to ICU** → `completeVisit`: a VISIT_COMPLETE encounter dated two minutes back, with REFER_TYPE; "Refer to other Hospital" adds the hospital, doctor and note obs that were typed.
- **Mother Death** → `completeVisit` with MOTHER_DECEASED_FLAG `YES` then the reason, or `reasonRequired` when the reason is empty.

The app also sets the visit end date and marks the visit read, as Android does.

**Deviation:** REFER_TYPE stores the English label whatever the phone's language (decided 2026-10-23, Kaveri); Android stores the label in the UI language.

## Visit risk score

`computeVisitRisk(latest, cervixReadings, stage3Started, now)` is Android's `VisitAlertProcessor` score (whitelabel-master `b3ddd15`):

- `latest` is the newest obs of each `RISK_FIELD_IDS` field across the visit (the app's latest-per-concept read); each `R` scores 1 (`RISK_SCORE.redObs`), anything else 0.
- Systolic and Diastolic together score at most 1.
- Until Stage 3 starts, add 2 (`RISK_SCORE.cervixStalled`) when the latest Cervix value has lasted its limit (9 cm 2 h, 8 cm 2.5 h, 7 cm 3 h, 6 cm 5 h, 5 cm 6 h), counted from the first card of the unbroken run of that value. `cervixReadings` are the visit's Cervix obs that have a value and an alert code, each with its card's time.

`formatVisitRisk(score)` gives the `VISIT_RISK` text as Java writes a double (`3.0`). Android recomputes and stores it after every partogram save. The older weighted formula (`RiskWeightConfig`, Y = 0.5) is dead code in Android and is not ported. The patient-list order built on the score belongs to the Home screen and is not ported yet.

## How an app uses it (mobile)

The app owns storage, notifications and timing. For each active visit on each monitor tick:

| Result of `decideNextStep` | Mobile does (one `transact`, see `apps/mobile/DB_CONVENTIONS.md`) |
|---|---|
| `createCard` | Write the card (`encounter_time`, `privacynotice_value`), then the `ENCOUNTER_TYPE` obs with `step.marker`. If any card was created this tick: one "Time to collect the History data!" notification + sound |
| `markDecisionPending` | Only if DECISION_PENDING is not already `'true'`: set it, and mark the visit dirty |
| `preSync` | Start a background sync, once sync exists |
| `wait`, `notMonitored`, `invalidTime` | Nothing |

The web app only reads, for example `getUpcomingStep` for "next card due" and `getCardLayout` to show a card.

## Not yet included

- Stage 4 (postpartum) cards and fields (SOS labels for Stage 4 are ready);
- the delivery form;
- Stage 4 validation;
- the patient-list order built on the risk score (Home screen);
- Assessment / Plan note rules (non-empty, add-only, timestamped when added) and the free-text filter on medicine inputs;
- administering a doctor's prescription (`*_PRESCRIBED`) into a card;
- the prolonged-labour warning (Stage 1 ≥ 12 h / 10 h, Stage 2 ≥ 3 h / 2 h, by parity);
- the range hint shown on the first keystroke (UI: use `getRangeFor`).

## Commands

```
npx tsc --noEmit && npx eslint "src/**/*.ts" && npx vitest run
```
