/**
 * Calendar helpers — Gregorian (India) + Bikram Sambat (Nepal).
 * Per project_deployment_variants — Nepal deployment uses BS for capture + display;
 * server stores canonical Gregorian.
 */
import dayjs from 'dayjs';
import NepaliDate from 'nepali-date-converter';

import { clientConfig } from '@/core/config/clients';

export type CalendarSystem = 'AD' | 'BS';

export const isNepalDeployment = (): boolean => clientConfig.countryCode === 'NP';
export const isBsDefault = (): boolean => clientConfig.calendar === 'BS';

/** Format a Gregorian Date for display in the deployment's preferred calendar. */
export const formatDate = (date: Date | string, system?: CalendarSystem): string => {
  const sys = system ?? (isBsDefault() ? 'BS' : 'AD');
  const ad = dayjs(date);
  if (sys === 'BS') {
    const bs = new NepaliDate(ad.toDate());
    return bs.format('DD MMMM YYYY');
  }
  return ad.format('DD MMM YYYY');
};

/** "9:30 AM": the clock time for display; Figma writes the day period in capitals. */
export const formatClockTime = (date: Date | string): string =>
  new Date(date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).toUpperCase();

/** "21:05": the 24-hour clock time for display. */
export const format24HourTime = (date: Date | string): string => dayjs(date).format('HH:mm');

/** Convert a BS date string ("YYYY-MM-DD") to a JS Date in Gregorian. */
export const bsStringToAd = (bsString: string): Date => {
  const [y, m, d] = bsString.split('-').map(Number);
  return new NepaliDate(y, m - 1, d).toJsDate();
};
