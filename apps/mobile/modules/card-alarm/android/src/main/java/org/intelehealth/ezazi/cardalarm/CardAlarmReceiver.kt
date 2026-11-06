package org.intelehealth.ezazi.cardalarm

import android.app.AlarmManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Every wake-up enters here: our alarms, and the system events that clear or shift alarms (boot, app
 * update, clock or time-zone change, "Alarms & reminders" granted). It only hands over to
 * [CardScanService]; the JS task decides what is due and arms the next alarms. All of these
 * broadcasts may start a foreground service from the background.
 */
class CardAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val reason = when (intent.action) {
      CardAlarmScheduler.ACTION_WAKE -> intent.getStringExtra(CardAlarmScheduler.EXTRA_REASON) ?: "main"
      Intent.ACTION_BOOT_COMPLETED, "android.intent.action.QUICKBOOT_POWERON" -> "boot"
      Intent.ACTION_MY_PACKAGE_REPLACED -> "update"
      Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED -> "clock"
      AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED -> "exactAccess"
      else -> return
    }
    // Logged out: nothing may wake the app (the alarms were cancelled, but a delivery can be in flight).
    if (!CardAlarmState.isRunning(context)) return

    val dueAt = intent.getDoubleExtra(CardAlarmScheduler.EXTRA_DUE_AT, 0.0)
    val now = System.currentTimeMillis()
    val late = if (dueAt > 0) "${now - dueAt.toLong()}ms" else "-"
    CardAlarmState.appendLog(context, "fired reason=$reason due=${dueAt.toLong()} vsDue=$late")
    CardScanService.start(context, reason, dueAt)
  }
}
