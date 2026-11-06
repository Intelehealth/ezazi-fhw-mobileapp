// The card engine's wake-up (2026-11-06, CARD_ENGINE_ALARM_PLAN.md). Replaces the dataSync foreground
// service and the 1-minute alarm chain, which Android 15+ stopped after 6 hours (open point #22).

// The alarm clock rings this long before the card is due, so a cold app start (1-3 s) is over and the
// task waits for the exact due second: the card is written on time and no delay carries forward.
export const CARD_PRE_WAKE_MS = 20_000;

// The watchdog alarm, in case the main wake-up failed. Every scan re-arms both, so it normally never rings.
export const CARD_WATCHDOG_DELAY_MS = 2 * 60_000;

// A task woken early never waits longer than this for the due second (a wrong clock cannot hold it).
export const CARD_MAX_WAIT_MS = 60_000;

// A card still due right after a scan is scanned again at once, at most this many times.
export const CARD_MAX_RESCANS = 2;

// After that (a visit whose scan keeps failing), try again in a minute rather than give up.
export const CARD_RETRY_DELAY_MS = 60_000;

// The JS task the native CardScanService runs (modules/card-alarm, CardScanService.TASK_NAME).
export const CARD_SCAN_TASK = 'CardScan';

// Triggers of the old monitor, cancelled on start so an app updated mid-labour shows no stray
// "Monitor check" notification from them.
export const LEGACY_TRIGGER_IDS = ['labour-monitor-trigger', 'battery-guard-trigger'];

// Splash: how long to wait for the "Alarms & reminders" page to open before going on without it.
export const MONITOR_SETTINGS_OPEN_TIMEOUT_MS = 3000;
