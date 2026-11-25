import { useEffect, useState } from 'react';
import type { CardLayout, StoredObs } from '@ezazi/clinical-rules';

import { getDb } from '@/core/db';
import { useDbBootstrapStore } from '@/core/session/dbBootstrap.store';
import { logger } from '@/core/utils/logger';

import { readCaptureCard } from '../data/captureReader';
import { readStoredCardObs } from '../data/labourRepository';
import { toCaptureHeader, toCaptureLayout, type CaptureCardHeader } from '../domain/captureCard';

export interface CardCaptureViewModel {
  header: CaptureCardHeader;
  /** The fields the card shows; null when the package has no layout for it yet. */
  layout: CardLayout | null;
  /** What is already saved on the card (newest first): shown by Show, compared by an edit's save. */
  stored: readonly StoredObs[];
}

/**
 * The capture screen's ViewModel (MVVM): the card it opens, read once the database is ready.
 * Null until then, or when the card cannot be read.
 */
export function useCardCaptureViewModel(encounterUuid: string): CardCaptureViewModel | null {
  const dbReady = useDbBootstrapStore((state) => state.phase === 'ready');
  const [card, setCard] = useState<CardCaptureViewModel | null>(null);

  useEffect(() => {
    if (!dbReady) return;
    try {
      const row = readCaptureCard(encounterUuid, getDb());
      const header = row ? toCaptureHeader(row) : null;
      const stored = row && header ? readStoredCardObs(encounterUuid, getDb()) : [];
      setCard(row && header ? { header, layout: toCaptureLayout(row), stored } : null);
    } catch (error: unknown) {
      logger.error('[capture] card read failed', error);
    }
  }, [encounterUuid, dbReady]);

  return card;
}
