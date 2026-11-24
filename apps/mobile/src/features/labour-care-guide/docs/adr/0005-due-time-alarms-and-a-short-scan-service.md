# ADR-0005: Cards come from due-time alarm clocks and a short scan service

- **Status:** Accepted
- **Date:** 2026-11-06
- **Decided by:** Module owner (go-ahead), device-tested
- **Supersedes:** the 1-minute monitor alarm and `dataSync` foreground service of 2026-10-23

## Context
The first card engine ran on a 1-minute alarm with a long-running `dataSync` foreground service. On a 15-hour device
run (2026-11-01) Android 15+ stopped the service after 6 hours, leaving 40–90 minute gaps, and the 1-minute alarm
drifted up to a minute per card. PendingIntents grew to about 1,200. Android's own engine drifts about 15 minutes over
Stage 1.

## Options considered
- **Keep the 1-minute alarm and the foreground service.** Stopped after 6 h a day; not fixable from JS.
- **Exact alarms only.** Can be deferred by the system.
- **An alarm clock just before each due card, a watchdog after it, and a short scan service per wake-up.** Needs a
  small native module; shows the alarm icon while a labour is monitored.

## Decision
- An alarm clock rings 20 s before the earliest due card; the task waits for the due second, so the card's time is its
  due time. A watchdog exact alarm 2 min after creates the card if the first wake failed.
- Each scan runs inside a short foreground service (`modules/card-alarm`, Kotlin, Expo Modules API).
- Alarms are re-armed after every scan (in `finally`), on stage change, visit start, login, return to the app, boot,
  app update, clock change and exact-access grant.
- "Alarms & reminders" is required on the splash screen, with Android's blocking dialog.
- The battery check runs every 5 minutes on the same module, and also creates a card more than 3 s overdue.

## Consequences
- Device run (Galaxy Tab, Android 16, in no Samsung exemption list): every card 5–17 ms after its due time, in all
  five cases (open, background, swiped away, locked, light Doze); a crashed wake recovered by the watchdog at +2 min;
  PendingIntents steady at about 25.
- Deep Doze is not entered while a card alarm is within 30 min: more battery during a labour. To be measured in the
  20-hour run.
- Samsung may put an app unused for days to sleep; the setup guidance for that was removed for now.
- A native module to maintain.

## Evidence
`apps/mobile/CARD_ENGINE_ALARM_PLAN.md` · `9015925`, `a111c2e`, `6ab0071` · `ARCHITECTURE_RULES.md` §11 rules 1–13 ·
LABOUR_OPEN_POINTS Settled 2026-11-06 (former points 10, 11, 22, 23).
