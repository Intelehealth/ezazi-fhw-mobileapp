# labour-care-guide

Labour monitoring for one visit: the Timeline, card capture, SOS and the end of each stage (Android `partogram/` and `TimelineVisitSummaryActivity`). Clinical rules are not in this folder; they come from `@ezazi/clinical-rules`.

## Layers (MVVM)

| Layer | Where | Holds |
|---|---|---|
| View | `screens/`, `components/` | Drawing only; never imports `core/db` or `data/`. `PatientAppBar` is mounted by the navigator (`patientAppBar` / `patientCaptureAppBar`), never by a screen |
| ViewModel | `stores/useTimelineViewModel.ts` | Reads the visit, re-reads when its tables change, re-derives card states every minute, `captureSos()` |
| ViewModel | `stores/usePatientHeaderViewModel.ts` | The app bar's patient line, re-read when the patient or obs change |
| ViewModel | `stores/useCardCaptureViewModel.ts` | The card a capture screen opens |
| Model | `data/` | `timelineReader` (`readTimeline`, `readPatient`), `captureReader`, `labourRepository` (`saveCard`, `captureSos`, `endStage1`, `refreshVisitRisk`) |
| Model | `domain/` | Pure mapping: `timelineModel` (card rows → timeline), `captureCard` (card → capture title), `captureForm` (form ↔ the package's `CardInput`) |

New cards are created by `core/services/cardGeneration`, which runs in the background for every open visit; this feature only reads them.

## Stage map

| UI stage | Stored as | Cards |
|---|---|---|
| 1. Stage 1 | `Stage1_Hour1_1` … `Stage1_Hour15_2` | Every 30 min; Decision Pending after the last |
| 2. Stage 2 | `Stage2_Hour1_1` … `Stage2_Hour5_4` | Every 15 min; Decision Pending after the last |
| 3. Delivery Outcome | `DELIVERY_OUTCOME_STAGE3` | One form |
| 4. Very Early PP | Android `Stage3_*` cards | Android's "Stage 3" is the UI's Stage 4 |

- **SOS card:** an `LCG_SOS` encounter plus one `SOS_STAGE_HOUR` obs, `StageX_HourY_SOSn`.
- **Card time:** `encounter_time` is `yyyy-MM-dd HH:mm:ss` in UTC.

## Status (2026-10-26)

- **Built:** the Timeline for Stage 1 from the database, card generation, the new-card alert, SOS capture, the save and End Stage 1 writers, the capture form model.
- **Not built yet:** the capture screen's tabs and save (its route, app bar and title exist), the End Stage 1 UI, the Stage 2 and postpartum screens, edit and read-only modes.
- **Dev builds** (`EXPO_PUBLIC_DEV_SEED=true`): Home offers a seeded test patient (every card state) and a live test visit that the card engine runs in real time (`core/db/seeds`).
