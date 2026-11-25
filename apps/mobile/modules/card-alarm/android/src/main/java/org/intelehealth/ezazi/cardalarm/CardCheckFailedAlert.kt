package org.intelehealth.ezazi.cardalarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * The card check could not run in the background: the scan service was refused (an inexact alarm may not
 * start it on Android 12+, which is what is left once "Alarms & reminders" access is revoked), or the
 * catch-up job found a missed card with that access off. No card is created until the app is opened, so
 * the nurse is told to open it. One notification, replaced on a repeat; tapping it opens the app, where
 * the catch-up scan runs. Cleared once card alarms are armed exactly again, and on logout.
 */
internal object CardCheckFailedAlert {
  private const val TAG = "CardAlarm"
  private const val CHANNEL_ID = "labour-card-check-failed"
  private const val NOTIFICATION_ID = 7302

  fun show(context: Context, why: String) {
    if (!CardAlarmState.isRunning(context)) return
    CardAlarmState.appendLog(context, "checkFailedAlert $why")
    try {
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        manager.createNotificationChannel(
          NotificationChannel(CHANNEL_ID, CardAlarmState.checkFailedChannelName(context), NotificationManager.IMPORTANCE_HIGH),
        )
      }
      val body = CardAlarmState.checkFailedBody(context)
      val notification = NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(context.applicationInfo.icon)
        .setContentTitle(CardAlarmState.checkFailedTitle(context))
        .setContentText(body)
        .setStyle(NotificationCompat.BigTextStyle().bigText(body))
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setCategory(NotificationCompat.CATEGORY_REMINDER)
        .setContentIntent(openApp(context))
        .setAutoCancel(true)
        .setOnlyAlertOnce(true)
        .build()
      NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
    } catch (error: Exception) {
      // e.g. notifications not allowed: the wake log still shows the failure.
      Log.e(TAG, "could not show the card-check-failed notification", error)
    }
  }

  fun clear(context: Context) {
    try {
      NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
    } catch (_: Exception) {
      // Nothing shown, or the manager is unavailable: nothing to clear.
    }
  }

  private fun openApp(context: Context): PendingIntent? {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    return PendingIntent.getActivity(context, NOTIFICATION_ID, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }
}
