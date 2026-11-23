package org.intelehealth.ezazi.cardalarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Runs the JS task "CardScan" for a few seconds after a wake-up, as a short foreground service: it holds
 * a wake lock (HeadlessJsTaskService) and keeps the process out of the cached-app freezer until the task
 * ends, then stops itself. Without it the scan could be frozen half way (Android 14+ freezes a process
 * about 10 s after an alarm receiver ends). Its notification is minimal; Android usually does not show a
 * foreground-service notification at all for a service that ends within 10 s.
 */
class CardScanService : HeadlessJsTaskService() {
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // Must come first: a service started with startForegroundService has seconds to call this.
    startInForeground()
    super.onStartCommand(intent, flags, startId)
    // A shortService is never restarted by the system; a lost wake-up is caught by the watchdog alarm.
    return START_NOT_STICKY
  }

  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig {
    val data = Arguments.createMap().apply {
      putString("reason", intent?.getStringExtra(CardAlarmScheduler.EXTRA_REASON) ?: "main")
      putDouble("dueAt", intent?.getDoubleExtra(CardAlarmScheduler.EXTRA_DUE_AT, 0.0) ?: 0.0)
    }
    // Allowed in the foreground too: the app may be open when a card falls due.
    return HeadlessJsTaskConfig(TASK_NAME, data, TASK_TIMEOUT_MS, true)
  }

  /** shortService time limit (about 3 minutes) reached: stop cleanly instead of being killed. */
  override fun onTimeout(startId: Int) {
    Log.w(TAG, "short service timed out")
    stopSelf()
  }

  override fun onTimeout(startId: Int, fgsType: Int) {
    Log.w(TAG, "short service timed out")
    stopSelf()
  }

  private fun startInForeground() {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, CardAlarmState.channelName(this), NotificationManager.IMPORTANCE_MIN),
      )
    }
    val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle(CardAlarmState.notificationTitle(this))
      .setPriority(NotificationCompat.PRIORITY_MIN)
      .setSilent(true)
      .build()
    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE
    } else {
      0
    }
    ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, type)
  }

  companion object {
    private const val TAG = "CardAlarm"
    const val TASK_NAME = "CardScan"
    private const val TASK_TIMEOUT_MS = 120_000L
    private const val CHANNEL_ID = "labour-card-check"
    private const val NOTIFICATION_ID = 7301

    fun start(context: Context, reason: String, dueAt: Double) {
      val intent = Intent(context, CardScanService::class.java)
        .putExtra(CardAlarmScheduler.EXTRA_REASON, reason)
        .putExtra(CardAlarmScheduler.EXTRA_DUE_AT, dueAt)
      try {
        ContextCompat.startForegroundService(context, intent)
      } catch (error: Exception) {
        // e.g. ForegroundServiceStartNotAllowedException: logged so a device run shows it; the watchdog
        // alarm or the catch-up job tries again.
        Log.e(TAG, "could not start the card scan service ($reason)", error)
        CardAlarmState.appendLog(context, "startFailed reason=$reason error=${error.javaClass.simpleName}")
      }
    }
  }
}
