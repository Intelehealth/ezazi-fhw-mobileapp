package org.intelehealth.ezazi.cardalarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log

/**
 * The alarms that wake the card engine. Each slot has one stable PendingIntent (fixed data URI), so
 * setting a slot again replaces its alarm and nothing piles up.
 *
 * - MAIN: an alarm clock shortly before the next card is due. The only alarm Android never defers
 *   (Doze, battery saver, standby buckets); it also keeps the device out of deep Doze.
 * - WATCHDOG: an exact alarm a little after the due time, in case the main wake-up failed.
 * - BATTERY: the low-battery check.
 * - CATCH_UP: "now", set by [CatchUpWorker] when a due card was missed.
 */
internal object CardAlarmScheduler {
  private const val TAG = "CardAlarm"
  const val ACTION_WAKE = "org.intelehealth.ezazi.cardalarm.WAKE"
  const val EXTRA_REASON = "reason"
  const val EXTRA_DUE_AT = "dueAt"

  enum class Slot(val reason: String) {
    MAIN("main"),
    WATCHDOG("watchdog"),
    BATTERY("battery"),
    CATCH_UP("catchUp"),
  }

  private fun alarmManager(context: Context) = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  fun canScheduleExact(context: Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager(context).canScheduleExactAlarms()

  private fun intentFor(context: Context, slot: Slot, dueAt: Long): Intent =
    Intent(context, CardAlarmReceiver::class.java)
      .setAction(ACTION_WAKE)
      .setData(Uri.parse("ezazi-card-alarm://slot/${slot.reason}"))
      .putExtra(EXTRA_REASON, slot.reason)
      .putExtra(EXTRA_DUE_AT, dueAt.toDouble())

  private fun pendingIntent(context: Context, slot: Slot, dueAt: Long): PendingIntent =
    PendingIntent.getBroadcast(
      context,
      slot.ordinal,
      intentFor(context, slot, dueAt),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

  /** Tapping the status-bar alarm icon opens the app. One stable request code, so no PendingIntent leak. */
  private fun showIntent(context: Context): PendingIntent? {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    return PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  /** Returns "alarmClock", "exact" or "inexact" — what Android actually accepted. */
  fun set(context: Context, slot: Slot, triggerAt: Long, dueAt: Long): String {
    val manager = alarmManager(context)
    val operation = pendingIntent(context, slot, dueAt)
    val kind = try {
      if (!canScheduleExact(context)) {
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, operation)
        "inexact"
      } else if (slot == Slot.MAIN) {
        manager.setAlarmClock(AlarmManager.AlarmClockInfo(triggerAt, showIntent(context)), operation)
        "alarmClock"
      } else {
        manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, operation)
        "exact"
      }
    } catch (error: SecurityException) {
      // Access revoked between the check and the call.
      manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, operation)
      "inexact"
    }
    Log.i(TAG, "set ${slot.reason} at $triggerAt (due $dueAt) as $kind")
    return kind
  }

  fun cancel(context: Context, slot: Slot) {
    alarmManager(context).cancel(pendingIntent(context, slot, 0))
  }

  fun cancelAll(context: Context) {
    Slot.entries.forEach { cancel(context, it) }
  }
}
