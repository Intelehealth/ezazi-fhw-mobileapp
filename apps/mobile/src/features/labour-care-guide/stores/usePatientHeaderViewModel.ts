import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getDb, onTablesChanged } from '@/core/db';
import { obs, patient } from '@/core/db/schema';
import { useDbBootstrapStore } from '@/core/session/dbBootstrap.store';
import { logger } from '@/core/utils/logger';

import { readPatient } from '../data/timelineReader';
import { ageInYears, fullName, type PatientRow } from '../domain/timelineModel';
import type { PatientSummary } from '../domain/timeline.types';

// Gravida is an Admission obs, so a new obs row can change the line.
const WATCHED_TABLES = [patient, obs];

/**
 * The patient app bar's ViewModel: the visit's patient once the database is ready, re-read on
 * any write to its tables. Null until the first read, or when the visit has no patient.
 */
export function usePatientHeaderViewModel(visitUuid: string): PatientSummary | null {
  const { t } = useTranslation();
  const dbReady = useDbBootstrapStore((state) => state.phase === 'ready');
  const [row, setRow] = useState<PatientRow | null>(null);

  useEffect(() => {
    if (!dbReady) return undefined;
    const load = () => {
      try {
        setRow(readPatient(visitUuid, getDb()));
      } catch (error: unknown) {
        logger.error('[patientHeader] read failed', error);
      }
    };
    load();
    return onTablesChanged(WATCHED_TABLES, load);
  }, [visitUuid, dbReady]);

  return useMemo(
    () =>
      row
        ? {
            id: row.patientUuid,
            name: fullName(row),
            ezId: row.openmrsId ?? '',
            ageYears: ageInYears(row.dateOfBirth, Date.now()) ?? 0,
            // The slot always shows; its value comes from registration later (field still to be confirmed).
            gravidaLabel: row.gravida
              ? t('timeline.gravidaShort', { gravida: row.gravida })
              : t('timeline.gravidaMissing'),
          }
        : null,
    [row, t],
  );
}
