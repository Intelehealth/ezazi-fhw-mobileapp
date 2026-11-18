import { useEffect, useMemo, useState } from 'react';
import { SECTION_ID } from '@ezazi/clinical-rules';
import type { CardAccess, CardLayout, SectionId, StoredObs } from '@ezazi/clinical-rules';

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
  /** Back in the bottom bar: the previous tab; on the first tab of a read-only card, back to the Timeline. */
  goBack: () => void;
  /** Whether the bottom bar shows Back: from the second tab, and on every tab of a read-only card. */
  showBack: boolean;
  /** Next: the next tab without blocking; on the last tab, Save (Update on an edited card). */
  goNext: () => void;
  /** The bottom button's label key: Android's Save / Update on the last tab, else Next. */
  nextLabelKey: 'capture.next' | 'capture.save' | 'capture.update';
  /** Saving, or the last tab of a read-only card (nothing to save; Kaveri, 2026-11-06). */
  nextDisabled: boolean;
  /** Checks the rules and saves, or jumps to the first tab in error (last Next, Save & Exit). */
  save: () => void;
  saveState: SaveState;
  /** An older submitted card: shown as saved, nothing can be changed or saved (Android READ). */
  readOnly: boolean;
}

interface CaptureFormInput {
  visitUuid: string;
  encounterUuid: string;
  layout: CardLayout;
  /** How the Timeline opened the card: `write` new, `edit` the newest submitted, `read` an older one. */
  access: Exclude<CardAccess, 'none'>;
  /** What is already saved on the card, loaded into the form for `edit` and `read`. */
  stored: readonly StoredObs[];
  onSaved: () => void;
  /** Leave without saving: Back on the first tab of a read-only card. */
  onExit: () => void;
}

/**
 * The capture form's ViewModel: the card's tabs, moving between them, and Save on the last
 * Next (Android `saveObs`). Save checks the rules first and jumps to the first tab in error.
 * A submitted card opens with its saved values: editable when newest, read-only otherwise.
 */
export function useCaptureFormViewModel({
  visitUuid,
  encounterUuid,
  layout,
  access,
  stored,
  onSaved,
  onExit,
}: CaptureFormInput): CaptureFormViewModel {
  const readOnly = access === 'read';
  const tabs = useMemo(() => toTabViews(layout, RANGE_PROFILE), [layout]);
  const { api, tabErrorCounts, submit, showMedication } = useCaptureForm(layout, RANGE_PROFILE, stored);
  const [tabIndex, setTabIndex] = useState(0);

  // Android writes the Medication "No"s only once that section has been drawn.
  const onMedicationTab = tabs[tabIndex]?.id === SECTION_ID.MEDICATION;
  useEffect(() => {
    if (onMedicationTab && !readOnly) showMedication();
  }, [onMedicationTab]); // eslint-disable-line react-hooks/exhaustive-deps -- once per arrival
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const isLastTab = tabIndex === tabs.length - 1;

  const save = async (values: CaptureFormValues) => {
    setSaveState('saving');
    try {
      const writer = await readWriterIdentity();
      if (!writer) throw new Error('no logged-in writer');
      const card = toCardInput(values, layout);
      saveCard({ visitUuid, encounterUuid, card, notes: values.notes, addedAt: values.addedAt, writer, now: Date.now() }, getDb());
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
    if (!readOnly && saveState !== 'saving') submit((values) => void save(values), jumpTo);
  };
  const isFirstTab = tabIndex === 0;
  // Android: "Save" on a new card, "Update" on an edited one (PartogramDataCaptureActivity 145).
  const lastLabel = access === 'edit' ? 'capture.update' : 'capture.save';

  return {
    tabs,
    tabIndex,
    setTabIndex,
    tabErrorCounts,
    form: api,
    isFirstTab,
    isLastTab,
    goBack: () => (readOnly && isFirstTab ? onExit() : setTabIndex((index) => Math.max(0, index - 1))),
    showBack: readOnly || !isFirstTab,
    goNext: () => (isLastTab ? trySave() : setTabIndex(tabIndex + 1)),
    nextLabelKey: isLastTab && !readOnly ? lastLabel : 'capture.next',
    nextDisabled: saveState === 'saving' || (readOnly && isLastTab),
    save: trySave,
    saveState,
    readOnly,
  };
}
