# `core/services/batteryGuard` — low-battery alert

> Rules for all background services: [`ARCHITECTURE_RULES.md`](../../../../ARCHITECTURE_RULES.md) §11.
> Uses the same AlarmManager pattern as [`../monitor/README.md`](../monitor/README.md), but is fully independent
> of it (own channels, notification ids, AsyncStorage keys and alarm chain) so it cannot regress the monitor.

## Purpose

Warn the health worker before the device dies during a monitored labour: a one-time dialog, then a
notification on every 1% drop, getting louder and harder to dismiss as the level falls.

## Behaviour

Thresholds are inclusive (`constants.ts`). Applies only while **unplugged**; plugging in (`CHARGING`,
`FULL` or `NOT_CHARGING`) clears everything.

| Battery | Dialog | Notification |
|---|---|---|
| > 35% | — | — |
| ≤ 35% | Once per discharge (`LowBatteryDialog`) | Silent, dismissable, one per 1% step |
| ≤ 30% | — | `ongoing` (cannot be swiped away) |
| exactly 30 / 20 / 10% | — | Plays a sound (alert channel) |

## Files

| File | Role |
|---|---|
| `constants.ts` | Thresholds, channel ids, notification id, AsyncStorage keys. |
| `batteryGuard.ts` | `evaluateBatteryNow()` (the state machine above), the 1-minute alarm chain, start/stop, pending-dialog persistence. |
| `batteryGuard.store.ts` | Zustand store for the dialog's visibility — UI state, not clinical data. |
| `index.ts` | `useBatteryGuard(enabled)` and `useDismissLowBatteryDialog()`. |
| `../../ui/LowBatteryDialog.tsx` | The dialog, rendered once from `RootNavigator`. |

## Why it is built this way

- **Polled, not event-driven.** `expo-battery`'s level listener only fires on Android's own BATTERY_LOW/OKAY broadcasts, far too coarse for a per-1% alert. The level is read on a 1-minute AlarmManager chain (survives Doze). The plug/unplug listener is not throttled, so it is used directly for an immediate reaction.
- **Two notification channels.** Android fixes a channel's sound at creation and ignores per-notification overrides, so silent and audible updates use different channels with the same notification id.
- **State in AsyncStorage.** "Dialog shown", "dialog pending" and "last notified %" survive the process being killed, so a restart does not replay alerts. A dialog triggered while the app was closed is shown on the next open.
- **Stopped on logout**, including the `ongoing` notification, which would otherwise stay stuck at its last percentage.

## Lifecycle

Login → `useBatteryGuard(true)` from `App.tsx`: create channels, set the running flag, evaluate once, schedule the next check, listen for plug changes, show any pending dialog.
Each check → dismiss the trigger notification, evaluate, re-arm if still running (background: `index.js`; foreground: listener in `index.ts`).
Logout → remove the plug listener, clear the running flag *first*, cancel the trigger, clear all alert state.

## Not production-ready yet

- `CHECK_INTERVAL_MINUTES = 1` is a test cadence (inline in `batteryGuard.ts`, not in `constants.ts`).
- The "is the charger connected" check is written twice in `batteryGuard.ts`.
- Shares the duplicated alarm loop with the monitor.

## Tests

`__tests__/evaluateBatteryNow.test.ts` (every threshold, plug states, unknown level, de-duplication, failure),
`useBatteryGuard.test.tsx` (enable/disable, pending dialog, foreground delivery routing, dismiss),
`handleCheckTriggerDelivered.test.ts`, `stopBatteryGuard.test.ts`. Real discharge behaviour still needs a device test.
