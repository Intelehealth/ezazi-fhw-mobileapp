import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getDb, onTablesChanged } from '@/core/db';
import { encounter, obs, visit, visitAttribute } from '@/core/db/schema';
import { useAuthStore } from '@/core/session/auth.store';
import { useDbBootstrapStore } from '@/core/session/dbBootstrap.store';
import { readWriterIdentity } from '@/core/session/writerIdentity';
import { logger } from '@/core/utils/logger';

import { captureSos as writeSosCard, type SosResult } from '../data/labourRepository';
import { readTimeline, type TimelineSnapshot } from '../data/timelineReader';
import { activeStageOf, ageInYears, buildCheckpoints, fullName } from '../domain/timelineModel';
import type { LabourStage, PatientSummary, TimelineCheckpoint } from '../domain/timeline.types';

const CLOCK_TICK_MS = 60_000;
const WATCHED_TABLES = [encounter, obs, visit, visitAttribute];

export interface TimelineViewModel {
  patient: PatientSummary | null;
  checkpoints: TimelineCheckpoint[];
  activeStage: LabourStage;
  /** The SOS button, after its confirm: Android's SOS card (encounter + SOS_STAGE_HOUR obs), or why not. */
  captureSos: () => Promise<SosResult | null>;
}

/**
 * The timeline's ViewModel (MVVM): reads the visit once the database is ready, re-reads on
 * any write to its tables, and re-derives card states every minute. Null until the first read.
 */
export function useTimelineViewModel(visitUuid: string): TimelineViewModel | null {
  const { t } = useTranslation();
  const providerUuid = useAuthStore((state) => state.userUuid);
  const dbReady = useDbBootstrapStore((state) => state.phase === 'ready');
  const [snapshot, setSnapshot] = useState<TimelineSnapshot | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!dbReady) return undefined;
    const load = () => {
      try {
        setSnapshot(readTimeline(visitUuid, providerUuid, getDb()));
      } catch (error: unknown) {
        logger.error('[timeline] read failed', error);
      }
    };
    load();
    return onTablesChanged(WATCHED_TABLES, load);
  }, [visitUuid, providerUuid, dbReady]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // The write lands in the tables watched above, so the timeline re-reads on its own.
  const captureSos = useCallback(async (): Promise<SosResult | null> => {
    if (!dbReady) return null;
    const writer = await readWriterIdentity();
    if (!writer) return null;
    try {
      const result = writeSosCard(visitUuid, writer, Date.now(), getDb());
      if (result.kind === 'blocked') logger.info('[timeline] SOS not created', result.reason);
      return result;
    } catch (error: unknown) {
      logger.error('[timeline] SOS write failed', error);
      return null;
    }
  }, [visitUuid, dbReady]);

  return useMemo(() => {
    if (!snapshot) return null;
    const { patient } = snapshot;
    return {
      patient: patient
        ? {
            id: patient.patientUuid,
            name: fullName(patient),
            ezId: patient.openmrsId ?? '',
            ageYears: ageInYears(patient.dateOfBirth, now) ?? 0,
            // The slot always shows; its value comes from registration later (field still to be confirmed).
            gravidaLabel: patient.gravida
              ? t('timeline.gravidaShort', { gravida: patient.gravida })
              : t('timeline.gravidaMissing'),
          }
        : null,
      checkpoints: buildCheckpoints(snapshot.cards, snapshot.visit, now),
      activeStage: activeStageOf(snapshot.currentCardName),
      captureSos,
    };
  }, [snapshot, now, t, captureSos]);
}
