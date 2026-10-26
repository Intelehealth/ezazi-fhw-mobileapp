import { SECTION_ID, sectionLabelKey } from '../constants';
import type { SectionId } from '../constants';
import { deepFreeze } from '../internal/deepFreeze';
import type { SectionDefinition } from './types';

/**
 * Stage 1/2 sections in display order, from `PartogramConstants.SECTION_LIST`.
 * Android's "Action" (Birth Outcome) and "Initials" sections were never shown,
 * so they are not ported.
 */
const section = (id: SectionId, androidLabel: string): SectionDefinition => ({
  id,
  labelKey: sectionLabelKey(id),
  androidLabel,
});

export const STAGE1_AND_2_SECTIONS: readonly SectionDefinition[] = deepFreeze([
  section(SECTION_ID.SUPPORTIVE_CARE, 'Supportive care'),
  section(SECTION_ID.BABY, 'Baby'),
  section(SECTION_ID.WOMAN, 'Woman'),
  section(SECTION_ID.LABOUR_PROGRESS, 'Labour Progress'),
  section(SECTION_ID.MEDICATION, 'Medication Administration'),
  section(SECTION_ID.SHARED_DECISION_MAKING, 'Shared Decision Making'),
]);
