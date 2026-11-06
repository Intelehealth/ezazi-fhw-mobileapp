package org.intelehealth.ezazi.cardalarm

import android.content.Context
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * What the native side must know without JS: whether a nurse is logged in ("running"; set by JS on
 * login, cleared first on logout, so no receiver wakes the app after it), and the next due time, for
 * [CatchUpWorker]. Plus the wake log: one line per wake-up with its lateness, in the app's external
 * files folder so `adb pull` can read it from any build. Times only, no clinical data.
 */
internal object CardAlarmState {
  private const val PREFS = "card_alarm"
  private const val KEY_RUNNING = "running"
  private const val KEY_NEXT_DUE_AT = "nextDueAt"
  private const val LOG_FILE = "card-wakes.log"
  private const val LOG_MAX_BYTES = 256 * 1024L

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun isRunning(context: Context) = prefs(context).getBoolean(KEY_RUNNING, false)

  fun setRunning(context: Context, running: Boolean) {
    // commit, not apply: logout must be on disk before the alarms are cancelled (CLAUDE.md rule 14).
    prefs(context).edit().putBoolean(KEY_RUNNING, running).commit()
  }

  fun nextDueAt(context: Context) = prefs(context).getLong(KEY_NEXT_DUE_AT, 0L)

  fun setNextDueAt(context: Context, dueAt: Long) {
    prefs(context).edit().putLong(KEY_NEXT_DUE_AT, dueAt).apply()
  }

  private fun logFile(context: Context): File? = context.getExternalFilesDir(null)?.let { File(it, LOG_FILE) }

  private fun stamp(millis: Long): String =
    SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.ROOT).apply { timeZone = TimeZone.getDefault() }.format(Date(millis))

  @Synchronized
  fun appendLog(context: Context, line: String) {
    try {
      val file = logFile(context) ?: return
      if (file.length() > LOG_MAX_BYTES) file.renameTo(File(file.parentFile, "$LOG_FILE.1"))
      file.appendText("${stamp(System.currentTimeMillis())} $line\n")
    } catch (_: Exception) {
      // The log is a diagnostic; it must never stop a wake-up.
    }
  }

  fun readLog(context: Context, maxLines: Int): List<String> =
    try {
      logFile(context)?.takeIf { it.exists() }?.readLines()?.takeLast(maxLines) ?: emptyList()
    } catch (_: Exception) {
      emptyList()
    }
}
