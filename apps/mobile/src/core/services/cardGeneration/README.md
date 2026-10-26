# cardGeneration

Creates labour cards on time for every open visit the logged-in provider holds, as Android's `CardGenerationEngine` does. The rules for running it are in ARCHITECTURE_RULES §11 (rules 10–13); the schedule itself is `decideNextStep` in `@ezazi/clinical-rules`.

## When it runs

- Every minute, from the monitor's AlarmManager delivery, after the alarm is re-armed (`core/services/monitor/backboneTrigger.ts`).
- Once right after login, as a catch-up (`core/services/monitor/index.ts`).

## What one scan writes, per visit, in one transaction

- **Next card** when the latest card is old enough: the encounter (`encounterRepo.insertCard`) and its `NORMAL` marker obs.
- **Decision Pending** `'true'` after a stage's last card; the visit is marked for sync.
- **Missed marker** (`MISSED_ENCOUNTER` = `-`) on an older card left empty. Android writes it while drawing the list; here the scan does (decided 2026-10-23).

When at least one card was created, `newCardAlert.ts` posts Android's "Alert!" notification with the `al_1` sound.

## Files

| File | Holds |
|---|---|
| `index.ts` | `runCardScan`: session check, single-flight, the alert |
| `scan.ts` | `scanVisit`, `scanAllVisits`: the database writes |
| `newCardAlert.ts`, `constants.ts` | Notification channel `labour-new-card-v1`, sound `al_1` |
