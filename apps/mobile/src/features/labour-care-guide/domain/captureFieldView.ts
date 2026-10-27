import { getFieldControl, getFieldOptions, getStepperSpec } from '@ezazi/clinical-rules';
import type {
  CardLayout,
  FieldControl,
  FieldDefinition,
  FieldId,
  MonitoringStage,
  RangeProfileId,
  SectionId,
  StepperId,
  StepperSpec,
} from '@ezazi/clinical-rules';

/** One option as the screen shows it: Android's stored value, its label key and English text. */
export interface OptionView {
  value: string;
  labelKey: string;
  androidLabel: string;
  alert: boolean;
}

/** One field as the screen draws it: the control, and its options or stepper bounds. */
export interface FieldView {
  id: FieldId;
  labelKey: string;
  androidLabel: string;
  control: FieldControl;
  options: OptionView[];
  bounds: StepperSpec | null;
}

/** One tab: a card section with its fields in Android order. */
export interface TabView {
  id: SectionId;
  labelKey: string;
  androidLabel: string;
  fields: FieldView[];
}

/** A field's control, options (by the card's stage, e.g. Cervix in Stage 2) and stepper bounds. */
export function toFieldView(field: FieldDefinition, stage: MonitoringStage, profile: RangeProfileId): FieldView {
  const control = getFieldControl(field.id);
  return {
    id: field.id,
    labelKey: field.labelKey,
    androidLabel: field.androidLabel,
    control,
    options: getFieldOptions(field, stage).map((option) => ({
      value: option.value,
      labelKey: option.labelKey,
      androidLabel: option.androidLabel,
      alert: option.alert === true,
    })),
    bounds: control === 'stepper' ? getStepperSpec(field.id as StepperId, profile) : null,
  };
}

/** The card's tabs, one per section, in the order the layout gives (Android's). */
export function toTabViews(layout: CardLayout, profile: RangeProfileId): TabView[] {
  return layout.sections.map(({ section, fields }) => ({
    id: section.id,
    labelKey: section.labelKey,
    androidLabel: section.androidLabel,
    fields: fields.map((field) => toFieldView(field, layout.stage, profile)),
  }));
}

/**
 * Fields grouped into rows: two steppers side by side (Figma "PULSE | TEMPERATURE"), every
 * other field on its own row.
 */
export function toFieldRows(fields: readonly FieldView[]): FieldView[][] {
  const rows: FieldView[][] = [];
  for (const field of fields) {
    const last = rows.at(-1);
    const pairs = field.control === 'stepper' && last?.length === 1 && last[0].control === 'stepper';
    if (pairs) last.push(field);
    else rows.push([field]);
  }
  return rows;
}
