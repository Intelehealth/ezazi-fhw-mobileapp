import { useCallback, useEffect, useMemo, useState } from 'react';
import { MS_PER_MINUTE, STAGE1_OUTCOME } from '@ezazi/clinical-rules';

import { getDb, onTablesChanged } from '@/core/db';
import { encounter, obs, visit, visitAttribute } from '@/core/db/schema';
import { useAuthStore } from '@/core/session/auth.store';
import { scanAndRearm } from '@/core/services/monitor/cardScheduler';
import { useDbBootstrapStore } from '@/core/session/dbBootstrap.store';
import { readWriterIdentity } from '@/core/session/writerIdentity';
import { logger } from '@/core/utils/logger';

import { captureSos as writeSosCard, endStage1, type SosResult } from '../data/labourRepository';
import { readTimeline, type TimelineSnapshot } from '../data/timelineReader';
import { activeStageOf, buildCheckpoints } from '../domain/timelineModel';
import type { LabourStage, TimelineCheckpoint } from '../domain/timeline.types';

const CLOCK_TICK_MS = MS_PER_MINUTE;
const WATCHED_TABLES = [encounter, obs, visit, visitAttribute];

export interface TimelineViewModel {
  checkpoints: TimelineCheckpoint[];
  activeStage: LabourStage;
  /** The SOS button, after its confirm: Android's SOS card (encounter + SOS_STAGE_HOUR obs), or why not. */
  captureSos: () => Promise<SosResult | null>;
  /**
   * End First Stage, after its confirm: Stage 2's first card, as Android's "Move to Stage 2" choice
   * (`cancelStage1ConfirmationDialog`). The other End Stage 1 choices come later. False when nothing was written.
   */
  startStage2: () => Promise<boolean>;
}

/**
 * The timeline's ViewModel (MVVM): reads the visit once the database is ready, re-reads on
 * any write to its tables, and re-derives card states every minute. Null until the first read.
 */
export function useTimelineViewModel(visitUuid: string): TimelineViewModel | null {
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
    try {
      const writer = await readWriterIdentity();
      if (!writer) return null;
      const result = writeSosCard(visitUuid, writer, Date.now(), getDb());
      if (result.kind === 'blocked') logger.info('[timeline] SOS not created', result.reason);
      return result;
    } catch (error: unknown) {
      logger.error('[timeline] SOS write failed', error);
      return null;
    }
  }, [visitUuid, dbReady]);

  const startStage2 = useCallback(async (): Promise<boolean> => {
    if (!dbReady) return false;
    try {
      const writer = await readWriterIdentity();
      if (!writer) return false;
      // Read now, not from the snapshot: a second tap must not start Stage 2 twice.
      if (activeStageOf(readTimeline(visitUuid, providerUuid, getDb()).currentCardName) !== 'stage1') return false;
      const started = endStage1(visitUuid, STAGE1_OUTCOME.MOVE_TO_STAGE2, {}, writer, Date.now(), getDb()).kind === 'startStage2';
      // The next card is now 15 min away, sooner than the Stage 1 alarm: arm it again (Android re-arms here too).
      if (started) void scanAndRearm('stageChange');
      return started;
    } catch (error: unknown) {
      logger.error('[timeline] Stage 2 start failed', error);
      return false;
    }
  }, [visitUuid, providerUuid, dbReady]);

  return useMemo(() => {
    if (!snapshot) return null;
    return {
      checkpoints: buildCheckpoints(snapshot.cards, snapshot.visit, now),
      activeStage: activeStageOf(snapshot.currentCardName),
      captureSos,
      startStage2,
    };
  }, [snapshot, now, captureSos, startStage2]);
}
