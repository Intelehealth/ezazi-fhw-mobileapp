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

/** Convert a BS date string ("YYYY-MM-DD") to a JS Date in Gregorian. */
export const bsStringToAd = (bsString: string): Date => {
  const [y, m, d] = bsString.split('-').map(Number);
  return new NepaliDate(y, m - 1, d).toJsDate();
};
