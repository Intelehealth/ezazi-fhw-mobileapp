import { formatCardName } from '../cards/cardName';
import { findCard } from '../cards/schedule';
import { STAGE } from '../constants';
import type { CardDefinition, MonitoringStage } from '../cards/types';
import { STAGE1_AND_2_SECTIONS } from './sections';
import { STAGE1_AND_2_FIELDS } from './stage1And2Fields';
import type { Stage1And2FieldId } from './stage1And2Fields';
import type { SectionId } from '../constants';
import type { CardLayout, CardSection, FieldDefinition, OptionDefinition } from './types';
import { deepFreeze } from '../internal/deepFreeze';

/**
 * Which fields a card shows: `PartogramDataCaptureActivity.prepareDataFor*` and
 * `TimelineAdapter.nextIntent`. Android order; empty sections are left out.
 */

/** Android `checkFiveHourField`: named "five hour", really the four-hourly exam cards. */
export const EXAM_CARD_NAMES: readonly string[] = deepFreeze([
  formatCardName(STAGE.STAGE1, 1, 1),
  formatCardName(STAGE.STAGE1, 5, 1),
  formatCardName(STAGE.STAGE1, 9, 1),
  formatCardName(STAGE.STAGE1, 13, 1),
  formatCardName(STAGE.STAGE2, 2, 2),
]);

const FIELDS_BY_ID: ReadonlyMap<string, FieldDefinition> = new Map(
  STAGE1_AND_2_FIELDS.map((field) => [field.id, field as FieldDefinition]),
);

function isShownOnCard(field: FieldDefinition, card: CardDefinition): boolean {
  switch (field.frequency[card.stage]) {
    case 'everyCard':
      return true;
    case 'hourlyCards':
      return card.slot === 1;
    case 'examCards':
      return EXAM_CARD_NAMES.includes(card.name);
  }
}

function groupBySection(fields: readonly FieldDefinition[]): readonly CardSection[] {
  return STAGE1_AND_2_SECTIONS.map((section) => ({
    section,
    fields: fields.filter((field) => field.section === section.id),
  })).filter((group) => group.fields.length > 0);
}

/** Every Stage 1/2 field, in Android order. */
export function getStage1And2Fields(): readonly FieldDefinition[] {
  return STAGE1_AND_2_FIELDS;
}

/** One field by id, or null. */
export function getField(id: Stage1And2FieldId | string): FieldDefinition | null {
  return FIELDS_BY_ID.get(id) ?? null;
}

/** The fields of one section, in Android order. */
export function getSectionFields(section: SectionId): readonly FieldDefinition[] {
  return STAGE1_AND_2_FIELDS.filter((field) => field.section === section);
}

/** A select field's options for a stage (Cervix differs in Stage 2). Empty for non-select fields. */
export function getFieldOptions(field: FieldDefinition, stage: MonitoringStage): readonly OptionDefinition[] {
  if (field.input.kind !== 'select') return [];
  return field.optionsByStage?.[stage] ?? field.input.options;
}

/** What a regular Stage 1/2 card shows. Null when the name is not such a card. */
export function getCardLayout(cardName: string): CardLayout | null {
  const card = findCard(cardName);
  if (!card) return null;
  return {
    stage: card.stage,
    sections: groupBySection(STAGE1_AND_2_FIELDS.filter((field) => isShownOnCard(field, card))),
  };
}

/** An SOS card shows every field of its stage (Android: HOURLY with a non-NORMAL type). */
export function getSosLayout(stage: MonitoringStage): CardLayout {
  return { stage, sections: groupBySection(STAGE1_AND_2_FIELDS) };
}
