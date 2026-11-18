package org.intelehealth.ezazi.cardalarm

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** JS side: `src/core/services/cardAlarm/native.ts`. */
class CardAlarmModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("CardAlarm")

    /** Login: the receivers may wake the app from now on, and the catch-up job runs. */
    Function("start") {
      CardAlarmState.setRunning(context, true)
      CatchUpWorker.ensure(context)
    }

    /** Logout: running flag off first (an in-flight wake-up then does nothing), then every alarm cancelled. */
    Function("stop") {
      CardAlarmState.setRunning(context, false)
      CardAlarmScheduler.cancelAll(context)
      CardAlarmState.setNextDueAt(context, 0L)
      CatchUpWorker.cancel(context)
    }

    Function("isRunning") { CardAlarmState.isRunning(context) }

    /** The due time the card alarms are armed for (epoch ms); 0 when none. */
    Function("nextDueAt") { CardAlarmState.nextDueAt(context).toDouble() }

    /** Next card: the alarm clock at [mainAt], the watchdog at [watchdogAt]. Ignored when logged out. */
    Function("armCards") { dueAt: Double, mainAt: Double, watchdogAt: Double ->
      if (!CardAlarmState.isRunning(context)) return@Function "stopped"
      CardAlarmState.setNextDueAt(context, dueAt.toLong())
      val kind = CardAlarmScheduler.set(context, CardAlarmScheduler.Slot.MAIN, mainAt.toLong(), dueAt.toLong())
      CardAlarmScheduler.set(context, CardAlarmScheduler.Slot.WATCHDOG, watchdogAt.toLong(), dueAt.toLong())
      kind
    }

    /** No card is coming (no open visit, or every visit waits for a decision). */
    Function("disarmCards") {
      CardAlarmState.setNextDueAt(context, 0L)
      CardAlarmScheduler.cancel(context, CardAlarmScheduler.Slot.MAIN)
      CardAlarmScheduler.cancel(context, CardAlarmScheduler.Slot.WATCHDOG)
    }

    Function("armBattery") { at: Double ->
      if (!CardAlarmState.isRunning(context)) return@Function "stopped"
      CardAlarmScheduler.set(context, CardAlarmScheduler.Slot.BATTERY, at.toLong(), at.toLong())
    }

    Function("disarmBattery") { CardAlarmScheduler.cancel(context, CardAlarmScheduler.Slot.BATTERY) }

    Function("canScheduleExactAlarms") { CardAlarmScheduler.canScheduleExact(context) }

    Function("isIgnoringBatteryOptimizations") {
      (context.getSystemService(Context.POWER_SERVICE) as PowerManager).isIgnoringBatteryOptimizations(context.packageName)
    }

    /** Android's battery-optimisation list (the user picks "Unrestricted"/"Don't optimise" there). */
    Function("openBatterySettings") {
      openFirst(
        Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}")),
      )
    }

    /** Samsung's "Never sleeping apps" list (deep link Samsung documents); false on other devices. */
    Function("openSamsungNeverSleeping") {
      openFirst(
        Intent("com.samsung.android.sm.ACTION_OPEN_CHECKABLE_LISTACTIVITY")
          .setPackage("com.samsung.android.lool")
          .putExtra("activity_type", 2),
      )
    }

    Function("appendWakeLog") { line: String -> CardAlarmState.appendLog(context, line) }

    Function("readWakeLog") { maxLines: Int -> CardAlarmState.readLog(context, maxLines) }
  }

  private fun openFirst(vararg intents: Intent): Boolean {
    for (intent in intents) {
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      if (intent.resolveActivity(context.packageManager) != null) {
        try {
          context.startActivity(intent)
          return true
        } catch (_: Exception) {
          // try the next one
        }
      }
    }
    return false
  }
}
