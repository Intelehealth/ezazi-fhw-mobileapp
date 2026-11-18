import { requireOptionalNativeModule } from 'expo';

/** What Android accepted for an alarm: "inexact" means exact-alarm access is off. */
export type AlarmKind = 'alarmClock' | 'exact' | 'inexact' | 'stopped';

/** The native module `modules/card-alarm` (Android only): alarms, the scan service, the wake log. */
interface CardAlarmModule {
  start(): void;
  stop(): void;
  isRunning(): boolean;
  nextDueAt(): number;
  armCards(dueAt: number, mainAt: number, watchdogAt: number): AlarmKind;
  disarmCards(): void;
  armBattery(at: number): AlarmKind;
  disarmBattery(): void;
  canScheduleExactAlarms(): boolean;
  isIgnoringBatteryOptimizations(): boolean;
  openBatterySettings(): boolean;
  openSamsungNeverSleeping(): boolean;
  appendWakeLog(line: string): void;
  readWakeLog(maxLines: number): string[];
}

/** Null where the module is not built in (iOS, web, jest without a mock): callers then do nothing. */
export const cardAlarm = requireOptionalNativeModule<CardAlarmModule>('CardAlarm');
