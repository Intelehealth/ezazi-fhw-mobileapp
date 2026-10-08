export const MONITOR_CHANNEL_ID = 'labour-monitor';
export const MONITOR_NOTIFICATION_ID = 'labour-monitor-service';

// Short for dev visibility while proving the service stays alive; the real
// clinical cadence is minutes-scale (30/15-min Stage 1/2 intervals), unaffected
// by how often this heartbeat itself ticks (ARCHITECTURE_RULES §4 — checking
// more often than the clinical interval catches nothing new).
export const MONITOR_TICK_INTERVAL_MS = 5_000;

// The reliable layer — AlarmManager-backed, survives Doze/backgrounding.
// Confirmed via the 2026-10-01 soak test that the heartbeat above does not:
// RN's own setInterval/setTimeout fire on Android's Choreographer frame
// callbacks (JavaTimerManager.kt), which the OS stops delivering once there's
// no visible window to vsync against — no flag or wake lock changes that.
// 1 minute here is a *test* cadence for fast feedback via a self-rescheduling
// TimestampTrigger; IntervalTrigger's own floor is 15 minutes, which is
// exactly Stage 1/2's production interval class (30/15-min) — so production
// use switches to a plain IntervalTrigger, no manual rescheduling needed.
// `-v2`: Android fixes a channel's importance at creation and ignores later
// changes, so making this channel IMPORTANCE_MIN needed a new id.
export const MONITOR_TRIGGER_CHANNEL_ID = 'labour-monitor-trigger-v2';
export const MONITOR_TRIGGER_NOTIFICATION_ID = 'labour-monitor-trigger';
export const MONITOR_TRIGGER_INTERVAL_MINUTES = 1;

export const MONITOR_TRIGGER_TICK_COUNT_KEY = 'monitor_trigger_tick_count';
export const MONITOR_TRIGGER_LAST_TICK_AT_KEY = 'monitor_trigger_last_tick_at';
export const MONITOR_TRIGGER_RUNNING_FLAG_KEY = 'monitor_trigger_running';
