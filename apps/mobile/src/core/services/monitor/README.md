# `core/services/monitor` — labour monitor

> Rules for all background services: [`ARCHITECTURE_RULES.md`](../../../../ARCHITECTURE_RULES.md) §11.
> Sibling service built on the same pattern: [`../batteryGuard/README.md`](../batteryGuard/README.md).

## Purpose

Keep a reliable clock running while a labour is being monitored, including when the app is backgrounded,
the screen is locked or the device is in Doze. The clinical checks (Stage 1/2 observation intervals) will
run on this clock.

**What it does today:** it only ticks and records the ticks. It does **not** evaluate anything clinical
yet — `@ezazi/clinical-rules` is not imported, and no labour data is read.

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
| `index.ts` | `useMonitorService(enabled)` — starts both layers with retry and stops both on disable/unmount. `useMonitorTickCount()` / `useBackboneStatus()` for the debug badge. |
| `../../../../index.js` | Registers the foreground-service runner and routes `onBackgroundEvent` deliveries to `handleTriggerDelivered()`. |

## Lifecycle

1. **Boot** (`index.js`): `registerMonitorForegroundServiceHandler()` — must be at boot so Android can re-invoke the runner after killing the process.
2. **Login** (`App.tsx`): `useMonitorService(authStatus === 'authenticated')` starts the heartbeat, *then* the backbone — sequenced, not concurrent (concurrent starts dropped the heartbeat notification in testing).
3. **Each backbone delivery**: dismiss the displayed trigger notification, record the tick in AsyncStorage, re-arm if the running flag is still `'true'`. Delivered in the background → `index.js`; in the foreground → the `onForegroundEvent` listener in `index.ts`.
4. **Logout / unmount**: stop the backbone (flag cleared *first*, then trigger cancelled), then the heartbeat. Each step is isolated, so one failing does not leave the other running. A startup still in flight is cancelled and undone.

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
| `MONITOR_TRIGGER_INTERVAL_MINUTES` | 1 min, self-rescheduling `TimestampTrigger` | 15/30 min (Stage 2/1). These clear `IntervalTrigger`'s 15-min floor, so a plain `IntervalTrigger` can replace the re-arm chain. |
| Debug badge on `HomeScreen` | Shown | Remove (or `__DEV__` only). |
| `logger.debug` per tick | On | Already a no-op when `APP_ENV=production`. |

## Known gaps

- No clinical evaluation yet — wire `@ezazi/clinical-rules` on the backbone tick.
- Notification text ("eZAZI monitor active", "Monitor check") is hardcoded English, not i18n.
- `startWithRetry()` has no attempt limit.
- The alarm loop (flag → schedule → deliver → re-arm) is duplicated in `batteryGuard`; a shared helper would remove that.
- If Android restarts the foreground service while logged out, the registered runner still starts the tick loop — not yet verified on a device.

## Tests

`__tests__/foregroundService.test.ts` (start, tick cadence, no FGS fields per tick, subscribers, stop, failure),
`handleTriggerDelivered.test.ts` (record, re-arm, stop, failure), `useMonitorService.test.tsx` (enable/disable/unmount).
On-device behaviour (Doze, process kill, lock screen) is **not** covered by jest — re-run a soak test after any change here.
