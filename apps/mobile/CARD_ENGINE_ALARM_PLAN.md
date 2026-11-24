# Card engine: on-time cards without the foreground service

> **Status:** ☑ Built 2026-11-06 (go-ahead given); device testing in progress · **Revised:** 2026-11-06 (replaces the 2026-11-04 draft) · **Scope:** `apps/mobile/` only, no `packages/*` change
>
> **Why:** the RN monitor ran a `dataSync` foreground service + a 1-minute alarm. Android 15+ stops that service after 6 h (open point #22, 2026-11-01 run: 90 and 40 min gaps), its 5-second notification leaks PendingIntents (#23), and the 1-minute alarm makes every card 0–60 s late, which the rolling rule carries forward (~15 min by Stage 1's last card).
>
> **Must not change:** the clinical rule (next card when whole minutes since the latest card ≥ 30 / 15; card time = the moment it is created; no backfill), card names, missed markers, Decision Pending, SOS, the alert sound, logout stopping everything.

## 1. How the analysis was done (2026-11-06)

Five independent reviews, then the decisive claims re-checked in code:

| Review | Read |
|---|---|
| A. Android's card scheduler (reference code) | `PartogramScheduler`, `PartogramAlarmReceiver`, `PartogramReconcileWorker`, `CardGenerationEngine`, `BootCompleteReceiver`, `DateTimeUtils`, manifest; a simulation of card timing |
| B. Android OS rules | developer.android.com, AOSP `AlarmManagerService`, `DeviceIdleController`, `JobStatus`, `PowerManagerService`, Play policy |
| C. notify-kit internals | `NotifeeAlarmManager`, `NotificationManager`, `HeadlessTask`, `NotifeeEventSubscriber`, reboot/permission receivers |
| D. How reliable apps do it | AOSP Clock (DeskClock), xDrip+, Dexcom, Medisafe, Mediteo, Samsung developer docs, dontkillmyapp |
| E. RN delay chain | `clinical-rules` time helpers, `cardGeneration`, `monitor`, `batteryGuard` |

## 2. Timing requirements

Each requirement below is one the design in §4 meets; together they keep every card at its due second.

| # | Requirement | Why |
|---|---|---|
| R1 | Arm to the second, for the earliest due card only | Whole-minute arming makes each card 0–60 s late, and the rolling rule carries it forward |
| R2 | No minimum delay when a card is already due | A fixed delay adds up after every reboot, app open, login or skipped scan |
| R3 | The scan runs with a wake lock, outside the app freezer | A plain background job waits for a Doze maintenance window: minutes, or an hour+ in deep Doze |
| R4 | A safety net that runs in Doze (a watchdog alarm) | WorkManager does not run in Doze |
| R5 | An overlapping or failed scan re-runs and always re-arms | Otherwise a card is late, or no alarm is set until the next safety-net run |
| R6 | Exact-alarm access is required, never silently missing | Without it every alarm becomes inexact, up to ~22 min late per card |
| R7 | Clock change, locked reboot and app update re-arm | Otherwise cards come late or early |
| R8 | A latest encounter with an unreadable time, or of a non-stage type, never stops cards silently | Cards would stop for that visit with no sign |

Same as Android: the alarm is only a hint and due-ness is always re-derived from the database; the same card is never created twice; re-arm after every scan; cancel at Decision Pending, visit complete and logout; nothing runs when logged out; exact-alarm access required.

## 3. What the OS and our libraries actually guarantee (verified)

- **`setAlarmClock` is the only alarm Android promises not to delay.** It is exempt from Doze, battery saver, standby buckets and the user's "Restricted" setting, and the system leaves Doze shortly before it. Cost: an alarm icon in the status bar and "next alarm" on the lock screen, and the tablet does not enter deep Doze while a labour is monitored. (AOSP `AlarmManagerService`, `DeviceIdleController`; AOSP Clock and xDrip+ use it for exactly this.)
- **`setExactAndAllowWhileIdle` is "nearly precise"**, limited in Doze to **72 alarms per hour per app**, shared by all our chains. Today the 1-minute battery chain alone uses 60 of them.
- **WorkManager periodic work does not run in Doze**; it is only a catch-up when the screen comes on or the tablet charges.
- **A process that only received an alarm is frozen about 10 s after the receiver ends** (Android 14+ cached-app freezer), and a wake lock does not help a cached process. **notify-kit ends the receiver before our JS starts and holds nothing while it runs** (`NotifeeAlarmManager` `finishReceiverWhenDone`, `HeadlessTask.kt` has no wake lock). With the foreground service gone, a scan could be frozen half way.
- **notify-kit emits no event when notifications are off** (`NotificationManager.java` POST_NOTIFICATIONS check), so a notify-kit alarm chain stops silently if the user turns notifications off.
- **An exact alarm or alarm clock may start a foreground service from the background**, and RN's own `HeadlessJsTaskService` holds a wake lock while the JS task runs. A foreground service keeps the process out of the freezer.
- notify-kit rejects a trigger time in the past (`validateTrigger.ts`).

## 4. Final design

```
                       ┌────────────── re-arm after every scan ──────────────┐
                       ▼                                                      │
 Main:     setAlarmClock at (earliest due card − 20 s)  ─┐                    │
 Watchdog: setExactAndAllowWhileIdle at (due + 2 min)   ─┼─► CardAlarmReceiver ─► CardScanService
 Boot · app update · clock change · exact access granted ─┘   (native, Kotlin)     (short foreground service,
 15-min WorkManager catch-up → sets an alarm for "now"                              wake lock, runs JS task)
                                                                                         │
 JS task "CardScan": wait until the due second → scan all visits (Android rule) ─────────┘
                     → alert → compute next due → arm both alarms → stop service
```

1. **Wake-up: an alarm clock 20 s before the earliest due card** across this nurse's open visits. It is never deferred. The 20 s let the app start (1–3 s cold), and the task then waits until the exact due second and scans. Result: **the card is written at its due second, so no delay carries into later cards**, with the clinical rule unchanged (card time is still the moment it is created).
2. **Watchdog: a second, exact alarm 2 min after the due time.** If the first wake failed, this one creates the card. Every scan re-arms both, so in normal running the watchdog never fires.
3. **The scan runs inside a short foreground service** (`shortService` type, Android 14+; started from the alarm, which Android allows). It holds a wake lock and keeps the app out of the freezer until the JS task ends, then stops. Its notification is low importance and usually not shown (Android delays foreground-service notifications by up to 10 s, and the scan takes about 1–3 s).
4. **This needs a small native module** (`modules/card-alarm`, Kotlin, Expo Modules API, New Architecture by default, wired by its own config plugin, so `android/` stays generated): the receiver, the service, the alarm scheduling and the re-arm receivers. No library does this correctly: notify-kit releases the process before JS runs (§3), and the background-task libraries are WorkManager-based (not on time). The clinical logic stays in JS and `@ezazi/clinical-rules`; Kotlin only wakes the app.
5. **Re-arm on everything that can lose an alarm:** after each scan; Start Stage 2; visit start; login; return to the app; boot (after the first unlock, because the login and database are only readable then); app update; clock or time-zone change; exact-alarm access granted. A 15-min WorkManager job sets an alarm for "now" as a last catch-up. Logout clears the running flag first, then cancels everything (rule 14).
6. **Scan fixes (from the RN review):**
   - the task takes `now` the moment the due second arrives, not after other work;
   - a scan that joins one already running, with a later time, runs once more instead of reusing the older result;
   - after a scan, a card still due is scanned again at once (at most twice), never re-armed "+1 minute";
   - visits with Decision Pending already set arm nothing (otherwise the alarm would ring forever), as Android;
   - re-arming is serialized and wrapped in `try/finally`, so a failing scan cannot end the chain;
   - **duplicate-card guard** before writing a card (same visit and card name, not voided), as Android's `isEncounterAlreadyAvailable` plus the voided filter Android lacks (audit M1).
7. **Remove the old design:** notify-kit foreground service, 5-second heartbeat, 1-minute monitor chain, the `dataSync` type. notify-kit stays for the alert and the battery dialogs.
8. **Battery guard off the 1-minute chain:** check every 5 min on its own exact alarm and on every card wake. It is RN's own feature (Android has no battery-drain alert), so this changes no Android behaviour.
9. **Splash:** exact-alarm access and notifications **required** before the app can be used (Android blocks on exact alarms since `da07197`; notifications carry the new-card sound).
10. **Lateness log:** each wake records due time and actual scan time (last 100, AsyncStorage, no clinical data). The Home debug badge shows the next due time and the last lateness, so device runs measure it directly.

## 5. Decisions needed

| # | Decision | Recommended | Why |
|---|---|---|---|
| D1 | Alarm clock (icon in status bar while a labour is monitored) or exact alarm only | **Alarm clock** | The only alarm Android never defers; what Clock apps and xDrip+ use; the icon is honest on a ward tablet |
| D2 | Add the small native module | **Yes** | Without it the scan can be frozen half way once the foreground service is gone (§3); no library does it |
| D3 | Exact alarms and notifications required on splash | **Yes** | Android requires exact alarms; without notifications the new-card sound is lost |
| D4 | Battery guard every 5 min instead of 1 | **Yes** | Frees the screen-off alarm allowance; battery level changes slowly |
| D5 | Optional one-time guidance after login: set eZAZI to "Unrestricted" battery and add it to Samsung "Never sleeping apps" (deep link Samsung documents), not blocking | **Yes** | The only protection against Samsung putting the app to sleep; no Play-policy risk |
| D5 (2026-11-06) | **Removed for now:** too many prompts. Device tests ran with eZAZI in neither list and cards came within milliseconds; the only remaining risk is Samsung putting an app unused for days to sleep. Decide after the device testing; meanwhile a tablet-setup checklist item. The native functions (`openBatterySettings`, `openSamsungNeverSleeping`, `isIgnoringBatteryOptimizations`) stay in `modules/card-alarm` for that decision. | — | — |

Not needed: changing the card-time rule (writing the due time instead of the creation time). The pre-wake makes the creation time equal the due time already.

## 6. Use cases that must not break (each a jest test where possible, and a device test)

| # | Use case | After |
|---|---|---|
| U1 | First Stage 1 card at visit start; next 30 min later | ✅ re-arm after start |
| U2 | Stage 1 every 30 min, Stage 2 every 15, rolling, no backfill | ✅ same rule |
| U3 | End First Stage → Stage 2 card now, next in 15 min | ✅ re-arm after Start Stage 2 |
| U4 | Decision Pending after the stage's last card, then no more alarms | ✅ |
| U5 | Missed markers written by the engine | ✅ unchanged scan |
| U6 | SOS and card save/edit never move the schedule | ✅ |
| U7 | Several patients, each on its own schedule | ✅ earliest due across visits, scan all |
| U8 | One failing visit never blocks others | ✅ |
| U9 | App open: Timeline updates, sound plays | ✅ |
| U10 | Screen off, Doze, swiped from Recents, longer than 6 h | ✅ no service to time out |
| U11 | Reboot mid-labour | ✅ after the first unlock |
| U12 | Logout: nothing; login: catch-up card + re-arm | ✅ |
| U13 | Exact alarms or notifications turned off later | blocked on next open; watchdog/catch-up meanwhile |
| U14 | Low-battery dialog and ongoing notification | ✅ 5-min check |
| U15 | Two scans overlap (alarm, return to app, Start Stage 2) | ✅ no duplicate card |

## 7. Phases (one commit each, type check + lint + jest green, each revertable)

0. **Device spike, not committed:** minimal module (alarm clock → service → JS writes a timestamp). Prove on the tablet with the app swiped away, screen off, forced Doze, and after a reboot; measure alarm-to-scan time. **If it fails, stop and report** (fallback: keep a foreground service of type `specialUse`, which needs a Play declaration).
1. **Native module + config plugin** (receiver, service, alarm clock + watchdog, re-arm receivers, 15-min catch-up); JS wrapper with a jest mock.
2. **JS scheduler:** next due time, wait-to-due, rerun, mutex, Decision Pending exclusion, duplicate guard, lateness log; jest for U1–U8, U12, U15.
3. **Switch on:** headless task in `index.js`, re-arm call sites, logout cancel; the old 1-minute chain stops.
4. **Splash requirements (D3).** Guidance (D5) built, then removed for now (see D5).
5. **Battery guard 5 min (D4).**
6. **Remove the old foreground service, heartbeat and `dataSync`** (`expo prebuild --clean -p android`) after the soak test passes.
7. **Docs:** monitor and cardGeneration READMEs, ARCHITECTURE_RULES §11 and the §3 notify-kit row, CLAUDE.md rules 11–15, open points #10, #11, #22, #23, the demo deck slide.

## 8. Device tests (Galaxy Tab, Android 16) — "done" means all pass

| # | Test | Pass |
|---|---|---|
| T1 | App open, one patient | card within 5 s of due, sound, Timeline updates |
| T2 | End First Stage | Stage 2 card at once, next 15 min later |
| T3 | Three patients minutes apart | each on its own schedule |
| T4 | Screen off + `dumpsys deviceidle force-idle`, unplugged | within 5 s |
| T5 | Swiped from Recents 1 h | within 5 s |
| T6 | **20 h soak, screen off, Stage 1 then Stage 2** | every card within 5 s of due; no gap; Stage 1 card 30 within 1 min of 14 h 30 min after card 1 |
| T7 | Reboot mid-labour, unlock, do not open the app | next card on time |
| T8 | Main alarm cancelled by hand (`adb`) | watchdog creates the card within 2 min |
| T9 | Logout 1 h, then login | nothing while logged out; catch-up card on login |
| T10 | Last Stage 1 card | Decision Pending, then no alarm in `dumpsys alarm` |
| T11 | Exact alarms or notifications turned off | blocked on next open |
| T12 | Battery saver, airplane mode | on time |
| T13 | Clock moved, time zone changed | re-armed correctly |
| T14 | App updated (`adb install -r`) mid-labour | next card on time |
| T15 | Battery ≤ thresholds | dialog and ongoing alert as before |
| T16 | `dumpsys activity intents` hourly during T6 | no PendingIntent growth |

### Results, 2026-11-06 (Galaxy Tab SM-X135, Android 16, release-mode test APK, eZAZI in no Samsung exemption list)

| # | Case | Card due | Scanned |
|---|---|---|---|
| T1 | App open on the Timeline | 10:05:14 | +16 ms |
| T2, T3 | Background, screen on; a second patient moved to Stage 2 (End First Stage) runs on its own 15-min schedule | 10:11:01 | +9 ms |
| T5 | Swiped from Recents, process killed before the alarm (cold start) | 10:26:01 | +14 ms |
| T4 | Screen locked (screen off 15 min, confirmed in `dumpsys power`) | 10:35:14, 10:41:01 | +16, +12 ms |
| T4, T12 | Light Doze forced, battery unplugged (`dumpsys battery unplug`); deep Doze refused while an alarm clock is due within 30 min | 10:56:01, 11:05:14, 11:11:01 | +17, +17, +14 ms |
| T14 | App updated (`adb install -r`) mid-labour; MY_PACKAGE_REPLACED woke a scan, alarms kept | 11:26:01 | +5 ms |
| T8 | Main wake-up crashed (`am crash` while waiting for the due second) | 11:35:14 | watchdog at +2 min 0.07 s |
| — | App opened while a wake-up was waiting: two scans, one card, no duplicate | 11:56:01 | +7 ms |
| T9 | Logout: no alarms, no catch-up job, no wake-up at the next due time; login re-armed at once | 12:11:01 | none (correct) |
| T15 | Battery check every 5 min | — | +9-26 ms |
| T16 | PendingIntents | — | about 25, steady (was 1,200) |

Still to run: T6 (20 h soak), T7 (reboot), T10 (Decision Pending at the last card), T11 (exact alarms revoked), T13 (clock change), airplane mode and battery saver.

## 9. What no Android app can guarantee

Force stop; the tablet off or out of battery; before the first unlock after a reboot; eZAZI put into Samsung "Deep sleeping apps"; exact alarms revoked (Android kills the app). After any of these the next wake or app open creates one card and the schedule continues from it (no backfill, as Android).
