# ADR-0011: Text in `en.json`, time through `nowMs`, constants from the package

- **Status:** Accepted
- **Date:** 2026-11-18
- **Decided by:** Module owner

## Context
The 5 Nov audit found hard-coded English in the native scan service and battery channels, scattered `Date.now()`
calls, a hand-written medicine form, and local copies of Android's text rules. Each is a place where RN can quietly
differ from itself or from Android.

## Options considered
- **Fix them one by one when touched.** Cheap now; the pattern keeps coming back.
- **Make them module rules and fix them all now.**

## Decision
- Every user-visible text is in `en.json`, including notification titles, channel names and the native scan service's
  texts (passed with `cardAlarm.setTexts`). Hindi and Nepali show English until translations arrive.
- "Now" comes from `nowMs()` in `core/utils/datetime.ts` in labour, the card engine, the monitor, the battery guard and
  the seeds, and in `jwt.ts` and the sync status store (2026-11-24). `logger.ts` keeps its own clock read; it belongs
  to the app-wide logging code.
- The medicine form is react-hook-form + zod.
- `FIELD_ID` constants, `javaTrim` and `filterDigits` come from `@ezazi/clinical-rules`.
- The missing unit tests are added.

## Consequences
- One place to translate, one clock to fake in tests.
- Not enforced by a tool yet; review catches it until the labour lint rules land.

## Evidence
`db2a380`, `8009ca3` · LABOUR_OPEN_POINTS Settled 2026-11-18 ("Code rules", "Hindi / Nepali texts").
