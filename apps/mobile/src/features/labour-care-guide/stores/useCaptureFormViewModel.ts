import { useMemo, useState } from 'react';
import type { CardLayout, SectionId } from '@ezazi/clinical-rules';

import { RANGE_PROFILE } from '@/core/config/rangeProfile';
import { getDb } from '@/core/db';
import { readWriterIdentity } from '@/core/session/writerIdentity';
import { logger } from '@/core/utils/logger';

import { saveCard } from '../data/labourRepository';
import { toCardInput, type CaptureFormValues } from '../domain/captureForm';
import { toTabViews, type TabView } from '../domain/captureFieldView';
import type { CaptureFormApi } from '../domain/captureFormApi';
import { useCaptureForm } from './useCaptureForm';

export type SaveState = 'idle' | 'saving' | 'failed';

export interface CaptureFormViewModel {
  tabs: TabView[];
  tabIndex: number;
  setTabIndex: (index: number) => void;
  tabErrorCounts: Partial<Record<SectionId, number>>;
  form: CaptureFormApi;
  isFirstTab: boolean;
  isLastTab: boolean;
  /** Back in the bottom bar: the previous tab. */
  goBack: () => void;
  /** Next: the next tab without blocking; on the last tab, Save. */
  goNext: () => void;
  /** Checks the rules and saves, or jumps to the first tab in error (last Next, Save & Exit). */
  save: () => void;
  saveState: SaveState;
}

interface CaptureFormInput {
  visitUuid: string;
  encounterUuid: string;
  layout: CardLayout;
  onSaved: () => void;
}

/**
 * The capture form's ViewModel: the card's tabs, moving between them, and Save on the last
 * Next (Android `saveObs`). Save checks the rules first and jumps to the first tab in error.
 */
export function useCaptureFormViewModel({ visitUuid, encounterUuid, layout, onSaved }: CaptureFormInput): CaptureFormViewModel {
  const tabs = useMemo(() => toTabViews(layout, RANGE_PROFILE), [layout]);
  const { api, tabErrorCounts, submit } = useCaptureForm(layout, RANGE_PROFILE);
  const [tabIndex, setTabIndex] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const isLastTab = tabIndex === tabs.length - 1;

  const save = async (values: CaptureFormValues) => {
    setSaveState('saving');
    try {
      const writer = await readWriterIdentity();
      if (!writer) throw new Error('no logged-in writer');
      const notes = values.notes;
      saveCard({ visitUuid, encounterUuid, card: toCardInput(values, layout), notes, writer, now: Date.now() }, getDb());
      setSaveState('idle');
      onSaved();
    } catch (error: unknown) {
      logger.error('[capture] card save failed', error);
      setSaveState('failed');
    }
  };

  const jumpTo = (tab: SectionId | null) => {
    const index = tabs.findIndex((candidate) => candidate.id === tab);
    if (index >= 0) setTabIndex(index);
  };

  const trySave = () => {
    if (saveState !== 'saving') submit((values) => void save(values), jumpTo);
  };

  return {
    tabs,
    tabIndex,
    setTabIndex,
    tabErrorCounts,
    form: api,
    isFirstTab: tabIndex === 0,
    isLastTab,
    goBack: () => setTabIndex((index) => Math.max(0, index - 1)),
    goNext: () => (isLastTab ? trySave() : setTabIndex(tabIndex + 1)),
    save: trySave,
    saveState,
  };
}
