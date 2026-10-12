// Thresholds — all inclusive-at-the-boundary (e.g. exactly 35% triggers the
// dialog, exactly 30% both switches the notification to ongoing AND plays
// the milestone sound).
export const DIALOG_THRESHOLD_PERCENT = 35;
export const ONGOING_THRESHOLD_PERCENT = 30;
export const SOUND_MILESTONE_PERCENTS: readonly number[] = [30, 20, 10];

// Two channels, not one: Android fixes a channel's sound/vibration at
// creation time and ignores any later per-notification override, so the
// only way to have some updates silent and some audible is two channels —
// swap `channelId` per update, same notification `id` either way.
export const BATTERY_SILENT_CHANNEL_ID = 'battery-warning';
export const BATTERY_ALERT_CHANNEL_ID = 'battery-warning-alert';
export const BATTERY_NOTIFICATION_ID = 'battery-warning';

// AsyncStorage — survives the process being killed mid-discharge, so a
// restart doesn't re-show the one-time dialog or replay already-seen steps.
export const BATTERY_DIALOG_SHOWN_KEY = 'battery_guard_dialog_shown';
export const BATTERY_DIALOG_PENDING_KEY = 'battery_guard_dialog_pending';
export const BATTERY_LAST_NOTIFIED_PERCENT_KEY = 'battery_guard_last_notified_percent';
