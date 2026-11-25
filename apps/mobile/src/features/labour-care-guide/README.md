# labour-care-guide

Labour monitoring for one visit: the Timeline, card capture, SOS and the end of each stage (Android `partogram/` and
`TimelineVisitSummaryActivity`). This README is the module's entry point. It describes what is here and where to read
next; it holds **no status**. Status lives in git, in `apps/mobile/LABOUR_OPEN_POINTS.md` and in each plan.

## Read first

The app-wide rules (`apps/mobile/CLAUDE.md`, `ARCHITECTURE_RULES.md`, `MOBILE_STACK.md`, `DB_CONVENTIONS.md`) apply
here unchanged. The docs below add what is specific to labour; where they seem to disagree, the app-wide rule wins
and the conflict is raised.

| Doing | Read |
|---|---|
| Anything in this folder, the card engine, the card writer or the alarm module | [`docs/LABOUR_CONVENTIONS.md`](docs/LABOUR_CONVENTIONS.md) (read first) |
| Understanding how a card is created, captured, saved and ended | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Why something works the way it does, or changing a decided behaviour | [`docs/adr/`](docs/adr/README.md) |
| A question nobody has decided yet | `apps/mobile/LABOUR_OPEN_POINTS.md` |
| Cards, fields, ranges, validation, SOS rules | `packages/clinical-rules/CLINICAL_RULES_CONVENTIONS.md` + its `README.md` |
| Waking up on time in the background | `ARCHITECTURE_RULES.md` §11 + `src/core/services/monitor/README.md` |

## What lives here (MVVM)

| Layer | Where | Holds |
|---|---|---|
| View | `screens/`, `components/` | Drawing only; never imports `core/db` or `data/`. `PatientAppBar` is mounted by the navigator (`patientAppBar` / `patientCaptureAppBar`), never by a screen |
| ViewModel | `stores/useTimelineViewModel.ts` | Reads the visit, re-reads when its tables change, re-derives card states every minute; SOS, End Stage 1 and 2 |
| ViewModel | `stores/usePatientHeaderViewModel.ts` | The app bar's patient line |
| ViewModel | `stores/useCardCaptureViewModel.ts` | The card a capture screen opens, and its layout |
| ViewModel | `stores/useCaptureFormViewModel.ts`, `stores/useCaptureForm.ts` | The capture form: tabs, Next / Back, Android's save and typing checks, alerts, error counts per tab, save and its failure |
| Model | `data/` | `timelineReader`, `captureReader`, `labourRepository` (`saveCard`, `captureSos`, `endStage1`, `endStage2`, `refreshVisitRisk`, `readStoredCardObs`) |
| Model | `domain/` | Pure mapping: `timelineModel`, `captureCard`, `captureForm`, `captureForm.schema`, `captureFieldView`, `captureFormApi` |

## What labour depends on outside this folder

| Piece | Where | Role |
|---|---|---|
| Clinical rules | `@ezazi/clinical-rules` | Every clinical decision: schedule, fields, ranges, alerts, save rows, SOS, End Stage, risk |
| Card writer | `core/db/card.ts` (`writeCard`) | The one writer of a card's encounter and its marker |
| Card engine | `core/services/cardGeneration` | Creates due cards for every open visit, writes missed markers and Decision Pending |
| Wake-up | `core/services/monitor` + `modules/card-alarm` | Alarm clock before each due card, watchdog, short scan service, wake log |
| Writer identity | `core/session/writerIdentity.ts` | Who writes a row |
| Dev patients | `core/db/seeds` (`EXPO_PUBLIC_DEV_SEED`) | A seeded test patient and a live test visit, dev builds only |

## Stage map

| UI stage | Stored as | Cards |
|---|---|---|
| 1. Stage 1 | `Stage1_Hour1_1` … `Stage1_Hour15_2` | Every 30 min; Decision Pending after the last |
| 2. Stage 2 | `Stage2_Hour1_1` … `Stage2_Hour5_4` | Every 15 min; Decision Pending after the last |
| 3. Delivery Outcome | `DELIVERY_OUTCOME_STAGE3` | One form |
| 4. Very Early PP | Android `Stage3_*` cards | Android's "Stage 3" is the UI's Stage 4 |

- **SOS card:** an `LCG_SOS` encounter plus one `SOS_STAGE_HOUR` obs, `StageX_HourY_SOSn`.
- **Card time:** `encounter_time` is `yyyy-MM-dd HH:mm:ss` in UTC.

## Dev builds

With `EXPO_PUBLIC_DEV_SEED=true`, Home offers a seeded test patient (every card state) and a live test visit that
the card engine runs in real time (`core/db/seeds`). Release builds never show them.
