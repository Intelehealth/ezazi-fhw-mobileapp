# `core/services/monitor` — labour monitor

> Rules for all background services: [`ARCHITECTURE_RULES.md`](../../../../ARCHITECTURE_RULES.md) §11.
> Plan, analysis and decisions: [`CARD_ENGINE_ALARM_PLAN.md`](../../../../CARD_ENGINE_ALARM_PLAN.md) (2026-11-06).

## Purpose

Create each labour card on time while a nurse is logged in, with the app open, in the background, swiped
from Recents, locked, or untouched for hours. The card rules themselves are in `core/services/cardGeneration`
(`runCardScan`) and `@ezazi/clinical-rules`; this folder only decides **when** the scan runs.

## How a card comes on time

1. After every scan, `cardScheduler.scanAndRearm()` takes the earliest next due time across the provider's
   open visits (`ScanResult.nextDueAt`) and arms, through the native module `modules/card-alarm`:
   - an **alarm clock** 20 s before it (`CARD_PRE_WAKE_MS`) — the only alarm Android never defers;
   - a **watchdog** exact alarm 2 min after it (`CARD_WATCHDOG_DELAY_MS`), in case the first wake-up failed.
   No visit with a card coming (or Decision Pending already set): both are cancelled.
2. The alarm reaches the native `CardAlarmReceiver`, which starts `CardScanService` — a `shortService`
   foreground service that holds a wake lock and keeps the app out of Android 14+'s freezer — which runs the
   JS task `CardScan` (`cardScanTask.ts`, registered in `index.js`).
3. The task waits for the exact due second, scans (Android's rule: the new card's time is the scan moment,
   so it is the due time and no delay carries into later cards), then arms the next alarms (in `finally`).
   A card still due after a scan is rescanned at most twice, then retried in a minute.
4. Re-armed also on login, on every return to the app, after Start Stage 2 and after a visit start. Boot,
   app update, clock or time-zone change and "Alarms & reminders" granted wake the scan natively. A 15-min
   WorkManager job (`CatchUpWorker`) wakes it if a due card was missed by more than 3 min (WorkManager does
   not run in Doze, so it is only a last catch-up).
5. Logout: the native running flag is cleared first, then every alarm and the catch-up job are cancelled.

## Files

| File | Role |
|---|---|
| `index.ts` | `useMonitorService(enabled)`: start on login, stop on logout only (not on unmount), scan on return to the app; `useCardWakeLog()` for the Home debug badge. |
| `cardScheduler.ts` | `scanAndRearm(reason, dueAt)`: scan, rescans, arm the alarm clock and the watchdog; one call at a time; wake log line. |
| `cardScanTask.ts` | The `CardScan` task: wait to the due second, scan and re-arm; the battery alarm runs `handleBatteryWake`. |
| `cardAlarmNative.ts` | Typed wrapper of the native module (null where it is not built in). |
| `monitorAccess.ts` | Exact alarms (splash gate) and the one-time battery / Samsung "Never sleeping apps" guide. |
| `constants.ts` | Pre-wake, watchdog, rescan and retry timings; task name; old trigger ids cancelled on start. |
| `../../../../modules/card-alarm/` | Native (Kotlin): `CardAlarmScheduler` (alarm slots), `CardAlarmReceiver`, `CardScanService`, `CatchUpWorker`, `CardAlarmState` (running flag, next due, wake log), `CardAlarmModule` (JS API). |

## Wake log (device runs)

Every wake-up and scan is appended to `/sdcard/Android/data/org.intelehealth.ezazi/files/card-wakes.log`
(times only, no clinical data; 256 KB, then rotated to `.1`). Read it from any build with
`adb pull /sdcard/Android/data/org.intelehealth.ezazi/files/card-wakes.log`. Lines:
`fired reason=main due=<ms> vsDue=-20000ms` (the alarm), `scan reason=main due=<ms> vsDue=12ms cards=1 next=<ms>`
(the scan; `vsDue` is how late it ran), `startFailed …`, `catchUp …`, `scanFailed …`.

## What no app can guarantee

Force stop; the tablet off; before the first unlock after a reboot; eZAZI in Samsung "Deep sleeping apps";
exact alarms revoked. After any of these the next wake-up or app open creates one card, and the schedule
continues from it (no backfill, as Android).

<!-- 2026-11-06 Kaveri: superseded by the card-alarm redesign (dataSync service stopped after 6 h, 1-minute
alarm drifted up to a minute per card). The previous README, kept for history:

# `core/services/monitor` — labour monitor

> Rules for all background services: [`ARCHITECTURE_RULES.md`](../../../../ARCHITECTURE_RULES.md) §11.
> Sibling service built on the same pattern: [`../batteryGuard/README.md`](../batteryGuard/README.md).

## Purpose

Keep a reliable clock running while a labour is being monitored, including when the app is backgrounded,
the screen is locked or the device is in Doze. The clinical checks (Stage 1/2 observation intervals) will
run on this clock.

<!-- Superseded 2026-10-23 (Kaveri): the card engine now runs on the backbone tick. Original text:
**What it does today:** it only ticks and records the ticks. It does **not** evaluate anything clinical
yet — `@ezazi/clinical-rules` is not imported, and no labour data is read.
--&gt;
**What it does today:** every backbone tick, after re-arming, runs the card engine
(`core/services/cardGeneration`, `runCardScan`): for each open visit the logged-in provider holds it
creates the next Stage 1/2 card, sets Decision Pending at the stage limit and writes due missed markers,
all decided by `@ezazi/clinical-rules`. A catch-up scan runs once after startup. No session, no scan.

## Two layers

| Layer | File | What it is | Reliable when backgrounded? |
|---|---|---|---|
| Heartbeat | `foregroundService.ts` | Android foreground service (persistent "eZAZI monitor active" notification) + a JS `setInterval` tick. Keeps the process alive. | **No.** The tick stops once there is no visible window. |
| Backbone | `backboneTrigger.ts` | AlarmManager trigger notification (`SET_EXACT_AND_ALLOW_WHILE_IDLE`) that re-arms itself after every delivery. | **Yes.** The OS wakes the process. |

The heartbeat is for foreground freshness only. Anything that must happen on time belongs on the backbone.

## Files

| File | Role |
|---|---|
| `constants.ts` | Channel ids, notification ids, intervals, AsyncStorage keys. |
| `foregroundService.ts` | Heartbeat: start/stop the foreground service, tick counter, tick subscribers. |
| `backboneTrigger.ts` | Backbone: schedule, handle delivery (record tick + re-arm), stop, status. |
| `monitorAccess.ts` | Exact alarms ("Alarms & reminders"): `isExactAlarmAllowed()`, and `askForExactAlarms()`, which the splash screen calls after the runtime permissions to open the settings page. Without it the backbone alarm is inexact and Samsung defers it (2026-11-01 device run). |
<!-- | `index.ts` | `useMonitorService(enabled)` — starts both layers with retry and stops both on disable/unmount. `useMonitorTickCount()` / `useBackboneStatus()` for the debug badge. | --&gt;
| `index.ts` | `useMonitorService(enabled)` — starts both layers with retry and stops both on logout only (not on unmount); restarts the service and re-arms the alarm on return to the foreground. `useMonitorTickCount()` / `useBackboneStatus()` for the debug badge. |
| `../../../../index.js` | Registers the foreground-service runner and routes `onBackgroundEvent` deliveries to `handleTriggerDelivered()`. |

## Lifecycle

1. **Boot** (`index.js`): `registerMonitorForegroundServiceHandler()` — must be at boot so Android can re-invoke the runner after killing the process.
2. **Login** (`App.tsx`): `useMonitorService(authStatus === 'authenticated')` starts the heartbeat, *then* the backbone — sequenced, not concurrent (concurrent starts dropped the heartbeat notification in testing).
3. **Each backbone delivery**: dismiss the displayed trigger notification, record the tick in AsyncStorage, re-arm if the running flag is still `'true'`. Delivered in the background → `index.js`; in the foreground → the `onForegroundEvent` listener in `index.ts`.
<!-- 2026-11-01 Kaveri: commented out — swiping the app away stopped card creation; only logout stops the monitor now. --&gt;
<!-- 4. **Logout / unmount**: stop the backbone (flag cleared *first*, then trigger cancelled), then the heartbeat. Each step is isolated, so one failing does not leave the other running. A startup still in flight is cancelled and undone. --&gt;
4. **Logout** (`enabled` true → false): stop the backbone (flag cleared *first*, then trigger cancelled), then the heartbeat. Each step is isolated, so one failing does not leave the other running. A startup still in flight is undone. An unmount alone (the app swiped away from Recents) stops nothing: the process and the login live on, and cards must keep being created.

## Findings from on-device testing (2026-10-01 soak test)

Recorded from the code comments written at the time. Devices: an emulator and a physical Galaxy Tab A11.

| Finding | Consequence in the code |
|---|---|
| RN `setInterval`/`setTimeout` run on Choreographer frame callbacks (`JavaTimerManager.kt`); Android stops delivering them with no visible window. Wake lock, Doze exemption and headless-task registration did not help. | The backbone exists; the heartbeat is foreground-only. |
| Without `SCHEDULE_EXACT_ALARM`, the exact alarm silently became inexact (logcat: "SCHEDULE_EXACT_ALARM permission not granted"). | Permission added in `app.config.js`. |
| The first delivery landed while the app was in the foreground, `onBackgroundEvent` did not see it, nothing re-armed — **zero** backbone ticks in a 15-minute soak. | Foreground listener in `useMonitorService`. |
| Six-hour test: a cold start racing a lock-screen transition threw `ForegroundServiceStartNotAllowedException` and killed both layers silently. | `startWithRetry()` (2 s → 4 s → 8 s → 16 s → 30 s, then every 30 s). |
| Starting on mount raced SplashScreen's own `POST_NOTIFICATIONS` request; Splash hung on "Loading…". | Gated on authentication. |
| Re-sending the foreground-service fields on every tick logged a caught Bundle warning (Double where native expects Integer). | Only the first notification sets `asForegroundService`; ticks update content only. |
| Changing the trigger channel to `IMPORTANCE_MIN` had no effect — Android fixes importance at channel creation. | New channel id `labour-monitor-trigger-v2`. |

## Test settings vs production — not production-ready yet

| Setting | Now (test) | Production |
|---|---|---|
| `MONITOR_TICK_INTERVAL_MS` | 5 s | Foreground freshness only — choose with the UI. |
| `MONITOR_TRIGGER_INTERVAL_MINUTES` | 1 min, self-rescheduling `TimestampTrigger` | **1 min, kept** (decided 2026-10-23): Android scans every minute because each visit is at its own point in its schedule, and pre-sync is due one minute before a card. |
| Debug badge on `HomeScreen` | Shown | Remove (or `__DEV__` only). |
| `logger.debug` per tick | On | Already a no-op when `APP_ENV=production`. |

<!-- Superseded 2026-10-23 (Kaveri): production trigger cadence was "15/30 min (Stage 2/1). These clear
`IntervalTrigger`'s 15-min floor, so a plain `IntervalTrigger` can replace the re-arm chain." --&gt;

## Known gaps

- New cards post Android's "Alert!" / "Time to collect the History data!" on channel `labour-new-card-v1` with the `al_1` sound (`plugins/withAlertSound.js` bundles it). Android also skips the sound during a phone call; here the system's own call handling applies.
- In release builds, a user logged in before the creator uuid was stored (2026-10-23) must log in again before cards are generated (dev seed builds use a stand-in creator).
- Notification text ("eZAZI monitor active", "Monitor check") is hardcoded English, not i18n.
- `startWithRetry()` has no attempt limit.
- The alarm loop (flag → schedule → deliver → re-arm) is duplicated in `batteryGuard`; a shared helper would remove that.
- If Android restarts the foreground service while logged out, the registered runner still starts the tick loop — not yet verified on a device.

## Tests

`__tests__/foregroundService.test.ts` (start, tick cadence, no FGS fields per tick, subscribers, stop, failure),
`handleTriggerDelivered.test.ts` (record, re-arm, stop, failure), `useMonitorService.test.tsx` (enable/disable, keeps running on unmount).
On-device behaviour (Doze, process kill, lock screen) is **not** covered by jest — re-run a soak test after any change here.

-->
