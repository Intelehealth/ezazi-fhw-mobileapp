import { useEffect, useState } from 'react';

import { getDb } from '@/core/db';
import { useDbBootstrapStore } from '@/core/session/dbBootstrap.store';
import { logger } from '@/core/utils/logger';

import { readCaptureCard } from '../data/captureReader';
import { toCaptureHeader, type CaptureCardHeader } from '../domain/captureCard';

export interface CardCaptureViewModel {
  header: CaptureCardHeader;
}

/**
 * The capture screen's ViewModel (MVVM): the card it opens, read once the database is ready.
 * Null until then, or when the card cannot be read.
 */
export function useCardCaptureViewModel(encounterUuid: string): CardCaptureViewModel | null {
  const dbReady = useDbBootstrapStore((state) => state.phase === 'ready');
  const [header, setHeader] = useState<CaptureCardHeader | null>(null);

  useEffect(() => {
    if (!dbReady) return;
    try {
      const row = readCaptureCard(encounterUuid, getDb());
      setHeader(row ? toCaptureHeader(row) : null);
    } catch (error: unknown) {
      logger.error('[capture] card read failed', error);
    }
  }, [encounterUuid, dbReady]);

  return header ? { header } : null;
}
