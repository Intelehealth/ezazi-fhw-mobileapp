# cardGeneration

Creates labour cards on time for every open visit the logged-in provider holds, as Android's `CardGenerationEngine` does. The rules for running it are in ARCHITECTURE_RULES §11 (rules 10–13); the schedule itself is `decideNextStep` in `@ezazi/clinical-rules`.

## When it runs

- Every minute, from the monitor's AlarmManager delivery, after the alarm is re-armed (`core/services/monitor/backboneTrigger.ts`).
- Once right after login, as a catch-up (`core/services/monitor/index.ts`).

## What one scan writes, per visit, in one transaction

- **Next card** when the latest card is old enough: the encounter and its `NORMAL` marker obs, through `writeCard` (`core/db/card.ts`), the writer every card shares.
- **Decision Pending** `'true'` after a stage's last card; the visit is marked for sync.
- **Missed marker** (`MISSED_ENCOUNTER` = `-`, comment `''`) on an older card left empty.

**Deviations from Android:**

| Android | Here | Why |
|---|---|---|
| `TimelineAdapter` writes the Missed marker while drawing the list | The scan writes it | It is written even when nobody opens the Timeline (decided 2026-10-23, Kaveri) |
| The Missed marker's `creatoruuid` and `created_date` are NULL | Both filled | Written through `writeOne` like every obs (decided 2026-10-27, Kaveri) |
| One failing visit throws and aborts the whole tick, so no visit gets a card that minute | The failing visit is logged and skipped; the others still get their cards | One bad visit must not block every patient's cards (decided 2026-10-27, Kaveri) |

When at least one card was created, `newCardAlert.ts` posts Android's "Alert!" notification with the `al_1` sound.

## Files

| File | Holds |
|---|---|
| `index.ts` | `runCardScan`: session check, single-flight, the alert |
| `scan.ts` | `scanVisit`, `scanAllVisits`: the database writes |
| `newCardAlert.ts`, `constants.ts` | Notification channel `labour-new-card-v1`, sound `al_1` |
