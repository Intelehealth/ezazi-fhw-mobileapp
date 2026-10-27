import { useEffect, useState } from 'react';
import type { CardLayout } from '@ezazi/clinical-rules';

import { getDb } from '@/core/db';
import { useDbBootstrapStore } from '@/core/session/dbBootstrap.store';
import { logger } from '@/core/utils/logger';

import { readCaptureCard } from '../data/captureReader';
import { toCaptureHeader, toCaptureLayout, type CaptureCardHeader } from '../domain/captureCard';

export interface CardCaptureViewModel {
  header: CaptureCardHeader;
  /** The fields the card shows; null when the package has no layout for it yet. */
  layout: CardLayout | null;
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
      setCard(row && header ? { header, layout: toCaptureLayout(row) } : null);
    } catch (error: unknown) {
      logger.error('[capture] card read failed', error);
    }
  }, [encounterUuid, dbReady]);

  return card;
}
