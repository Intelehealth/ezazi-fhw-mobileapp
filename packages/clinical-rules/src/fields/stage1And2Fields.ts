import { FIELD_CONCEPT_KEY, FIELD_ID, SECTION_ID, STAGE, fieldLabelKey, optionLabelKey } from '../constants';
import type { FieldId } from '../constants';
import { deepFreeze } from '../internal/deepFreeze';
import { INPUT_LIMITS } from '../ranges/inputLimits';
import type { FieldDefinition, OptionDefinition } from './types';

/**
 * The 26 Stage 1 and Stage 2 fields (`PartogramConstants.getSectionParamInfoMasterMap`,
 * Android `8185b00`), in display order. Option `value`s are byte-identical to Android's.
 */

const option = (field: FieldId, value: string, slug: string, androidLabel: string): OptionDefinition => ({
  value,
  labelKey: optionLabelKey(field, slug),
  androidLabel,
});

/** One field: its concept key and label key come from its id, never retyped. */
function field<Id extends FieldId>(id: Id, data: Omit<FieldDefinition, 'id' | 'conceptKey' | 'labelKey'>) {
  return { id, conceptKey: FIELD_CONCEPT_KEY[id], labelKey: fieldLabelKey(id), ...data };
}

const YES_NO_DECLINES = (field: FieldId): readonly OptionDefinition[] => [
  option(field, 'Y', 'yes', 'Yes'),
  option(field, 'N', 'no', 'No'),
  option(field, 'D', 'womanDeclines', 'Woman Declines'),
];

const BOTH_STAGES_EVERY_CARD = { [STAGE.STAGE1]: 'everyCard', [STAGE.STAGE2]: 'everyCard' } as const;
const BOTH_STAGES_HOURLY = { [STAGE.STAGE1]: 'hourlyCards', [STAGE.STAGE2]: 'hourlyCards' } as const;
const BOTH_STAGES_EXAM = { [STAGE.STAGE1]: 'examCards', [STAGE.STAGE2]: 'examCards' } as const;

export const STAGE1_AND_2_FIELDS = deepFreeze([
  // ── Supportive care ──
  field(FIELD_ID.COMPANION, {
    section: SECTION_ID.SUPPORTIVE_CARE,
    androidLabel: 'Companion',
    input: { kind: 'select', options: YES_NO_DECLINES(FIELD_ID.COMPANION) },
    storage: 'value',
    frequency: BOTH_STAGES_HOURLY,
    androidSource: 'PartogramConstants.java:126-134',
  }),
  field(FIELD_ID.PAIN_RELIEF, {
    section: SECTION_ID.SUPPORTIVE_CARE,
    androidLabel: 'Pain relief',
    input: { kind: 'select', options: YES_NO_DECLINES(FIELD_ID.PAIN_RELIEF) },
    storage: 'value',
    frequency: BOTH_STAGES_HOURLY,
    androidSource: 'PartogramConstants.java:136-144',
  }),
  field(FIELD_ID.ORAL_FLUID, {
    section: SECTION_ID.SUPPORTIVE_CARE,
    androidLabel: 'Oral Fluid',
    input: { kind: 'select', options: YES_NO_DECLINES(FIELD_ID.ORAL_FLUID) },
    storage: 'value',
    frequency: BOTH_STAGES_HOURLY,
    androidSource: 'PartogramConstants.java:146-154',
  }),
  field(FIELD_ID.POSTURE, {
    section: SECTION_ID.SUPPORTIVE_CARE,
    androidLabel: 'Posture',
    input: {
      kind: 'select',
      options: [option(FIELD_ID.POSTURE, 'SP', 'supine', 'Supine'), option(FIELD_ID.POSTURE, 'MO', 'mobile', 'Mobile')],
    },
    storage: 'value',
    frequency: BOTH_STAGES_HOURLY,
    androidSource: 'PartogramConstants.java:156-164',
  }),

  // ── Baby ──
  field(FIELD_ID.BASELINE_FHR, {
    section: SECTION_ID.BABY,
    androidLabel: 'Baseline FHR',
    input: { kind: 'integer', limits: INPUT_LIMITS[FIELD_ID.BASELINE_FHR] },
    storage: 'value',
    frequency: BOTH_STAGES_EVERY_CARD,
    androidSource: 'PartogramConstants.java:171-178',
  }),
  field(FIELD_ID.FHR_DECELERATION, {
    section: SECTION_ID.BABY,
    androidLabel: 'FHR Deceleration',
    input: {
      kind: 'select',
      options: [
        option(FIELD_ID.FHR_DECELERATION, 'N', 'no', 'No'),
        option(FIELD_ID.FHR_DECELERATION, 'E', 'early', 'Early'),
        option(FIELD_ID.FHR_DECELERATION, 'L', 'late', 'Late'),
        option(FIELD_ID.FHR_DECELERATION, 'V', 'variable', 'Variable'),
      ],
    },
    storage: 'value',
    frequency: BOTH_STAGES_EVERY_CARD,
    androidSource: 'PartogramConstants.java:180-189',
  }),
  field(FIELD_ID.AMNIOTIC_FLUID, {
    section: SECTION_ID.BABY,
    androidLabel: 'Amniotic Fluid',
    input: {
      kind: 'select',
      options: [
        option(FIELD_ID.AMNIOTIC_FLUID, 'I', 'intact', 'I (Intact)'),
        option(FIELD_ID.AMNIOTIC_FLUID, 'C', 'clear', 'C (Clear fluid)'),
        option(FIELD_ID.AMNIOTIC_FLUID, 'M+', 'meconium1', 'M+ (Meconium stained fluid-Nonsignificant)'),
        option(FIELD_ID.AMNIOTIC_FLUID, 'M++', 'meconium2', 'M++ (Meconium stained fluid-Medium)'),
        option(FIELD_ID.AMNIOTIC_FLUID, 'M+++', 'meconium3', 'M+++ (Meconium stained fluid-Thick)'),
        option(FIELD_ID.AMNIOTIC_FLUID, 'B', 'bloodStained', 'B (Blood stained)'),
      ],
    },
    storage: 'value',
    frequency: BOTH_STAGES_EXAM,
    androidSource: 'PartogramConstants.java:191-200',
  }),
  field(FIELD_ID.FETAL_POSITION, {
    section: SECTION_ID.BABY,
    androidLabel: 'Fetal Position',
    input: {
      kind: 'select',
      options: [
        option(FIELD_ID.FETAL_POSITION, 'A', 'anterior', 'A (Occiput anterior)'),
        option(FIELD_ID.FETAL_POSITION, 'P', 'posterior', 'P (Occiput posterior)'),
        option(FIELD_ID.FETAL_POSITION, 'T', 'transverse', 'T (Occiput transverse)'),
      ],
    },
    storage: 'value',
    frequency: BOTH_STAGES_EXAM,
    androidSource: 'PartogramConstants.java:202-210',
  }),
  field(FIELD_ID.CAPUT, {
    section: SECTION_ID.BABY,
    androidLabel: 'Caput',
    input: {
      kind: 'select',
      options: [
        option(FIELD_ID.CAPUT, '0', 'none', '0 (None)'),
        option(FIELD_ID.CAPUT, '+', 'plus1', '+'),
        option(FIELD_ID.CAPUT, '++', 'plus2', '++'),
        option(FIELD_ID.CAPUT, '+++', 'plus3', '+++ (Marked)'),
      ],
    },
    storage: 'value',
    frequency: BOTH_STAGES_EXAM,
    androidSource: 'PartogramConstants.java:212-220',
  }),
  field(FIELD_ID.MOULDING, {
    section: SECTION_ID.BABY,
    androidLabel: 'Moulding',
    input: {
      kind: 'select',
      options: [
        option(FIELD_ID.MOULDING, '0', 'none', '0 (None)'),
        option(FIELD_ID.MOULDING, '+', 'plus1', '+ (Sutures apposed)'),
        option(FIELD_ID.MOULDING, '++', 'plus2', '++ (Sutures overlapped but reducible)'),
        option(FIELD_ID.MOULDING, '+++', 'plus3', '+++ (Sutures overlapped but not reducible)'),
      ],
    },
    storage: 'value',
    frequency: BOTH_STAGES_EXAM,
    androidSource: 'PartogramConstants.java:222-231',
  }),

  // ── Woman ──
  field(FIELD_ID.PULSE, {
    section: SECTION_ID.WOMAN,
    androidLabel: 'Pulse',
    input: { kind: 'integer', limits: INPUT_LIMITS[FIELD_ID.PULSE] },
    storage: 'value',
    frequency: BOTH_STAGES_EXAM,
    androidSource: 'PartogramConstants.java:238-244',
  }),
  field(FIELD_ID.SYSTOLIC_BP, {
    section: SECTION_ID.WOMAN,
    androidLabel: 'Systolic BP',
    input: { kind: 'integer', limits: INPUT_LIMITS[FIELD_ID.SYSTOLIC_BP] },
    storage: 'value',
    frequency: BOTH_STAGES_EXAM,
    androidSource: 'PartogramConstants.java:246-252',
  }),
  field(FIELD_ID.DIASTOLIC_BP, {
    section: SECTION_ID.WOMAN,
    androidLabel: 'Diastolic BP',
    input: { kind: 'integer', limits: INPUT_LIMITS[FIELD_ID.DIASTOLIC_BP] },
    storage: 'value',
    frequency: BOTH_STAGES_EXAM,
    androidSource: 'PartogramConstants.java:254-260',
  }),
  field(FIELD_ID.TEMPERATURE, {
    section: SECTION_ID.WOMAN,
    androidLabel: 'Temperature (°F)',
    input: { kind: 'decimal', limits: INPUT_LIMITS[FIELD_ID.TEMPERATURE] },
    storage: 'value',
    frequency: BOTH_STAGES_EXAM,
    androidSource: 'PartogramConstants.java:262-268',
  }),
  field(FIELD_ID.URINE_PROTEIN, {
    section: SECTION_ID.WOMAN,
    androidLabel: 'Urine protein',
    input: {
      kind: 'select',
      options: [
        option(FIELD_ID.URINE_PROTEIN, 'Negative', 'negative', 'No Proteinuria (P-)'),
        option(FIELD_ID.URINE_PROTEIN, 'Trace', 'trace', 'Trace of Proteinuria (P Trace)'),
        option(FIELD_ID.URINE_PROTEIN, 'P1+', 'p1', 'P1+'),
        option(FIELD_ID.URINE_PROTEIN, 'P2+', 'p2', 'P2+'),
        option(FIELD_ID.URINE_PROTEIN, 'P3+', 'p3', 'P3+'),
        option(FIELD_ID.URINE_PROTEIN, 'P4+', 'p4', 'P4+'),
      ],
    },
    storage: 'value',
    frequency: BOTH_STAGES_EXAM,
    androidSource: 'PartogramConstants.java:270-279',
  }),
  field(FIELD_ID.URINE_ACETONE, {
    section: SECTION_ID.WOMAN,
    androidLabel: 'Urine Acetone',
    input: {
      kind: 'select',
      options: [
        option(FIELD_ID.URINE_ACETONE, 'Negative', 'negative', 'No Acetonuria (A-)'),
        option(FIELD_ID.URINE_ACETONE, 'Trace', 'trace', 'Trace of Acetonuria (A Trace)'),
        option(FIELD_ID.URINE_ACETONE, 'A1+', 'a1', 'A1+'),
        option(FIELD_ID.URINE_ACETONE, 'A2+', 'a2', 'A2+'),
        option(FIELD_ID.URINE_ACETONE, 'A3+', 'a3', 'A3+'),
        option(FIELD_ID.URINE_ACETONE, 'A4+', 'a4', 'A4+'),
      ],
    },
    storage: 'value',
    frequency: BOTH_STAGES_EXAM,
    androidSource: 'PartogramConstants.java:281-289',
  }),

  // ── Labour progress ──
  field(FIELD_ID.CONTRACTIONS_PER_10MIN, {
    section: SECTION_ID.LABOUR_PROGRESS,
    androidLabel: 'Contractions per 10 min',
    input: { kind: 'integer', limits: INPUT_LIMITS[FIELD_ID.CONTRACTIONS_PER_10MIN] },
    storage: 'value',
    frequency: BOTH_STAGES_EVERY_CARD,
    androidSource: 'PartogramConstants.java:296-303',
  }),
  field(FIELD_ID.CONTRACTION_DURATION, {
    section: SECTION_ID.LABOUR_PROGRESS,
    androidLabel: 'Duration of contractions',
    input: { kind: 'integer', limits: INPUT_LIMITS[FIELD_ID.CONTRACTION_DURATION] },
    storage: 'value',
    frequency: BOTH_STAGES_EVERY_CARD,
    androidSource: 'PartogramConstants.java:305-312',
  }),
  field(FIELD_ID.CERVIX, {
    section: SECTION_ID.LABOUR_PROGRESS,
    androidLabel: 'Cervix Plot[X]',
    input: {
      kind: 'select',
      options: ['10', '9', '8', '7', '6', '5'].map((cm) => option(FIELD_ID.CERVIX, cm, cm, cm)),
    },
    optionsByStage: {
      [STAGE.STAGE2]: [option(FIELD_ID.CERVIX, 'P', 'pushing', 'Pushing'), option(FIELD_ID.CERVIX, '10', '10', '10')],
    },
    storage: 'value',
    frequency: { [STAGE.STAGE1]: 'examCards', [STAGE.STAGE2]: 'everyCard' },
    androidSource: 'PartogramConstants.java:314-329',
  }),
  field(FIELD_ID.DESCENT, {
    section: SECTION_ID.LABOUR_PROGRESS,
    androidLabel: 'Descent Plot[O]',
    input: {
      kind: 'select',
      options: ['5', '4', '3', '2', '1', '0'].map((fifths) => option(FIELD_ID.DESCENT, fifths, fifths, fifths)),
    },
    storage: 'value',
    frequency: { [STAGE.STAGE1]: 'examCards', [STAGE.STAGE2]: 'everyCard' },
    androidSource: 'PartogramConstants.java:331-344',
  }),

  // ── Medication administration ──
  field(FIELD_ID.OXYTOCIN, {
    section: SECTION_ID.MEDICATION,
    androidLabel: 'Oxytocin (U/L, drops/min)',
    input: { kind: 'infusion', variant: FIELD_ID.OXYTOCIN },
    storage: 'infusion',
    frequency: BOTH_STAGES_EVERY_CARD,
    androidSource: 'PartogramConstants.java:350-362',
  }),
  field(FIELD_ID.MEDICINE, {
    section: SECTION_ID.MEDICATION,
    androidLabel: 'Medicine',
    input: { kind: 'medicineList' },
    storage: 'medicineList',
    frequency: BOTH_STAGES_EVERY_CARD,
    androidSource: 'PartogramConstants.java:365-374',
  }),
  field(FIELD_ID.IV_FLUIDS, {
    section: SECTION_ID.MEDICATION,
    androidLabel: 'IV Fluids',
    input: { kind: 'infusion', variant: FIELD_ID.IV_FLUIDS },
    storage: 'infusion',
    frequency: BOTH_STAGES_EVERY_CARD,
    androidSource: 'PartogramConstants.java:376-387',
  }),

  // ── Shared decision making ──
  field(FIELD_ID.ASSESSMENT, {
    section: SECTION_ID.SHARED_DECISION_MAKING,
    androidLabel: 'Assessment',
    input: { kind: 'noteList' },
    storage: 'noteList',
    frequency: BOTH_STAGES_EVERY_CARD,
    androidSource: 'PartogramConstants.java:407-415',
  }),
  field(FIELD_ID.PLAN, {
    section: SECTION_ID.SHARED_DECISION_MAKING,
    androidLabel: 'Plan',
    input: { kind: 'noteList' },
    storage: 'noteList',
    frequency: BOTH_STAGES_EVERY_CARD,
    androidSource: 'PartogramConstants.java:417-424',
  }),
  field(FIELD_ID.SUPERVISOR_DOCTOR, {
    section: SECTION_ID.SHARED_DECISION_MAKING,
    androidLabel: 'Supervisor Doctor',
    input: { kind: 'text', characters: 'asciiLettersDigitsPunctuationSpace', capitalizeFirst: true },
    storage: 'value',
    frequency: BOTH_STAGES_EVERY_CARD,
    androidSource: 'PartogramConstants.java:444-451',
  }),
] as const satisfies readonly FieldDefinition[]);

/** Every Stage 1/2 field id, e.g. `'baselineFhr'`. */
export type Stage1And2FieldId = (typeof STAGE1_AND_2_FIELDS)[number]['id'];
