import {
  FIELD_ID,
  INFUSION_INPUT_ID,
  INFUSION_INPUT_LABELS,
  INFUSION_STATUS_OPTIONS,
  IV_FLUID_TYPE_OPTIONS,
  STAGE1_AND_2_FIELDS,
  STAGE1_AND_2_SECTIONS,
  STAGE1_OUTCOMES,
  validationMessageKey,
} from '@ezazi/clinical-rules';

import en from '@/core/i18n/locales/en.json';

const lookup = (key: string): unknown =>
  key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], en);

// Every (input, reason) pair the package's save and typing rules can raise.
const VALIDATION: [string, string][] = [
  ...[FIELD_ID.BASELINE_FHR, FIELD_ID.PULSE, FIELD_ID.SYSTOLIC_BP, FIELD_ID.DIASTOLIC_BP, FIELD_ID.TEMPERATURE, FIELD_ID.CONTRACTION_DURATION]
    .flatMap((id): [string, string][] => [[id, 'outOfRange'], [id, 'notANumber']]),
  [FIELD_ID.DIASTOLIC_BP, 'notBelowSystolic'],
  [FIELD_ID.DIASTOLIC_BP, 'enterSystolicFirst'],
  [FIELD_ID.OXYTOCIN, 'infusionIncomplete'],
  [FIELD_ID.IV_FLUIDS, 'infusionIncomplete'],
  [FIELD_ID.MEDICINE, 'medicineMissing'],
  [INFUSION_INPUT_ID.STRENGTH, 'outOfRange'],
  [INFUSION_INPUT_ID.INFUSION_RATE, 'outOfRange'],
];

describe('English labels for @ezazi/clinical-rules keys', () => {
  const keys = [
    ...STAGE1_AND_2_FIELDS.flatMap((field) => [
      field.labelKey,
      ...(field.input.kind === 'select' ? field.input.options.map((o) => o.labelKey) : []),
      ...Object.values(field.optionsByStage ?? {}).flatMap((options) => options.map((o) => o.labelKey)),
    ]),
    ...STAGE1_AND_2_SECTIONS.map((section) => section.labelKey),
    ...Object.values(INFUSION_INPUT_LABELS).map((label) => label.labelKey),
    ...[...INFUSION_STATUS_OPTIONS, ...IV_FLUID_TYPE_OPTIONS].map((option) => option.labelKey),
    ...STAGE1_OUTCOMES.map((outcome) => outcome.labelKey),
    ...VALIDATION.map(([id, reason]) => validationMessageKey(id, reason)),
  ];

  it('has a non-empty English text for every key', () => {
    expect(keys.filter((key) => typeof lookup(key) !== 'string' || lookup(key) === '')).toEqual([]);
  });

  it('fills range messages from the rule, not typed numbers', () => {
    expect(lookup(validationMessageKey(FIELD_ID.BASELINE_FHR, 'outOfRange'))).toContain('{{min}}');
    expect(JSON.stringify(lookup('partogram.validation'))).not.toMatch(/\b(90|220|89\.6|109)\b/);
  });
});
