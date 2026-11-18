import { useCallback, useEffect, useMemo, useState } from 'react';
import { MS_PER_MINUTE, STAGE1_OUTCOME } from '@ezazi/clinical-rules';
import type {
  EndStage1Decision,
  EndStage2Decision,
  EndStage2Details,
  OutcomeDetails,
  Stage1OutcomeId,
  Stage2OutcomeId,
  VisitOutcomeSummary,
} from '@ezazi/clinical-rules';

import { getDb, onTablesChanged } from '@/core/db';
import { encounter, obs, visit, visitAttribute } from '@/core/db/schema';
import { useAuthStore } from '@/core/session/auth.store';
import { scanAndRearm } from '@/core/services/monitor/cardScheduler';
import { useDbBootstrapStore } from '@/core/session/dbBootstrap.store';
import { readWriterIdentity, type WriterIdentity } from '@/core/session/writerIdentity';
import { logger } from '@/core/utils/logger';

import {
  captureSos as writeSosCard,
  endStage1,
  endStage2,
  type EndStageResult,
  type SosResult,
} from '../data/labourRepository';
import { readTimeline, type TimelineSnapshot } from '../data/timelineReader';
import { activeStageOf, buildCheckpoints, endStageOf } from '../domain/timelineModel';
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
  /** Which End Stage the button does; null: a tap does nothing (Android stage 0). */
  endStage: 'stage1' | 'stage2' | null;
  /** Completed (VISIT_COMPLETE): no End Stage button, no quick actions, the outcome instead (Android). */
  visitComplete: boolean;
  /** Only the nurse holding the visit may end a stage (Android: the button is disabled otherwise). */
  isVisitHolder: boolean;
  outcome: VisitOutcomeSummary | null;
  /** One End Stage 1 choice (not Move to Stage 2, see startStage2); null when nothing could be written. */
  endStage1: (outcome: Stage1OutcomeId, details: OutcomeDetails) => Promise<EndStageResult<EndStage1Decision> | null>;
  /** One End Stage 2 choice; null when nothing could be written. */
  endStage2: (outcome: Stage2OutcomeId, details: EndStage2Details) => Promise<EndStageResult<EndStage2Decision> | null>;
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

  /**
   * Runs one End Stage write after re-reading the visit (not the snapshot): only in that stage, only by the
   * visit holder, never on a completed visit, so a second tap or a stale screen writes nothing (audit H1).
   * Any stage change or completion re-arms the card alarm (Android re-arms / cancels here too).
   */
  const runEndStage = useCallback(
    async <R extends { kind: string }>(stage: 'stage1' | 'stage2', write: (writer: WriterIdentity) => R): Promise<R | null> => {
      if (!dbReady) return null;
      try {
        const writer = await readWriterIdentity();
        if (!writer) return null;
        const current = readTimeline(visitUuid, providerUuid, getDb());
        if (endStageOf(current.currentCardName) !== stage || current.visit.visitComplete || !current.visit.isVisitHolder) {
          return null;
        }
        const result = write(writer);
        if (result.kind === 'startStage2' || result.kind === 'completeVisit') void scanAndRearm('stageChange');
        return result;
      } catch (error: unknown) {
        logger.error('[timeline] End Stage write failed', stage, error);
        return null;
      }
    },
    [visitUuid, providerUuid, dbReady],
  );

  const startStage2 = useCallback(
    async (): Promise<boolean> =>
      (await runEndStage('stage1', (writer) =>
        endStage1(visitUuid, STAGE1_OUTCOME.MOVE_TO_STAGE2, {}, writer, Date.now(), getDb()),
      ))?.kind === 'startStage2',
    [runEndStage, visitUuid],
  );

  const completeStage1 = useCallback(
    (outcome: Stage1OutcomeId, details: OutcomeDetails) =>
      runEndStage('stage1', (writer) => endStage1(visitUuid, outcome, details, writer, Date.now(), getDb())),
    [runEndStage, visitUuid],
  );

  const completeStage2 = useCallback(
    (outcome: Stage2OutcomeId, details: EndStage2Details) =>
      runEndStage('stage2', (writer) => endStage2(visitUuid, outcome, details, writer, Date.now(), getDb())),
    [runEndStage, visitUuid],
  );

  return useMemo(() => {
    if (!snapshot) return null;
    return {
      checkpoints: buildCheckpoints(snapshot.cards, snapshot.visit, now),
      activeStage: activeStageOf(snapshot.currentCardName),
      captureSos,
      startStage2,
      endStage: endStageOf(snapshot.currentCardName),
      visitComplete: snapshot.visit.visitComplete,
      isVisitHolder: snapshot.visit.isVisitHolder,
      outcome: snapshot.outcome,
      endStage1: completeStage1,
      endStage2: completeStage2,
    };
  }, [snapshot, now, captureSos, startStage2, completeStage1, completeStage2]);
}
