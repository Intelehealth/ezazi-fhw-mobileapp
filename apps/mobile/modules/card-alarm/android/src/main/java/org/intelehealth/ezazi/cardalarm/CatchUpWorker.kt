package org.intelehealth.ezazi.cardalarm

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/**
 * Last-resort catch-up every 15 minutes, with no constraints (offline, low battery). WorkManager does
 * not run while the device dozes, so this is NOT the timer and not the watchdog: it only notices, when
 * the device is awake, that a due card was missed (both alarms lost, e.g. an OEM dropped them) and wakes
 * the scan through an alarm, which may start the foreground service where a worker may not.
 */
class CatchUpWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
  override fun doWork(): Result {
    val context = applicationContext
    if (!CardAlarmState.isRunning(context)) return Result.success()
    val dueAt = CardAlarmState.nextDueAt(context)
    val now = System.currentTimeMillis()
    if (dueAt > 0 && now > dueAt + MISSED_AFTER_MS) {
      CardAlarmState.appendLog(context, "catchUp due=$dueAt vsDue=${now - dueAt}ms")
      CardAlarmScheduler.set(context, CardAlarmScheduler.Slot.CATCH_UP, now + 1_000L, dueAt)
    }
    return Result.success()
  }

  companion object {
    private const val UNIQUE_NAME = "card-alarm-catch-up"
    // Past the watchdog (due + 2 min) with room for its own scan.
    private const val MISSED_AFTER_MS = 3 * 60_000L

    fun ensure(context: Context) {
      val request = PeriodicWorkRequestBuilder<CatchUpWorker>(15, TimeUnit.MINUTES).build()
      WorkManager.getInstance(context).enqueueUniquePeriodicWork(UNIQUE_NAME, ExistingPeriodicWorkPolicy.KEEP, request)
    }

    fun cancel(context: Context) {
      WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_NAME)
    }
  }
}
