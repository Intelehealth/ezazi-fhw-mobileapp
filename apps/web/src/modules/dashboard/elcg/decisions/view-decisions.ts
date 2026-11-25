import type { DecisionSection } from '../../../../components/elcg/view-decisions-dialog.component';
import type { LcgHour, LcgStageNo } from '../elcg.types';
import {
  ivFluidLabel,
  medicationLabel,
  oxytocinLabel,
  recordedBy,
} from './decision.rows';

/** Which hour's assessment or plan is being viewed. */
export interface ViewedHour {
  kind: 'assessment' | 'plan';
  stage: LcgStageNo;
  /** 0-based, as the table reports it. */
  hourIndex: number;
}

export interface DecisionView {
  title: string;
  sections: DecisionSection[];
}

/** Newest first, as getEncounterAssessmentData() / getEncounterPlanData() sort. */
function newestFirst<T extends { obsDatetime: string }>(entries: T[]): T[] {
  return [...entries].sort(
    (a, b) =>
      new Date(b.obsDatetime).getTime() - new Date(a.obsDatetime).getTime()
  );
}

/** One section's lines: the entry, and only when it was recorded. */
function section<
  T extends { uuid: string; obsDatetime: string; initial: string },
>(heading: string, entries: T[], label: (entry: T) => string): DecisionSection {
  return {
    heading,
    items: newestFirst(entries).map(entry => ({
      uuid: entry.uuid,
      label: label(entry),
      meta: recordedBy(entry, false),
    })),
  };
}

/**
 * What the View dialog shows for one hour — partogram.component.ts's
 * viewAssessment() (the hour's assessments) and viewPlan() (its plans, then
 * the medication, oxytocin and IV fluids prescribed in it).
 */
export function decisionView(
  { kind, stage, hourIndex }: ViewedHour,
  hour: LcgHour
): DecisionView {
  const heading = kind === 'assessment' ? 'ASSESSMENT' : 'PLAN';
  const title = `${heading} [Stage ${stage}] [ Hour ${hourIndex + 1}]`;

  if (kind === 'assessment') {
    return {
      title,
      sections: [section(heading, hour.assessments, entry => entry.value)],
    };
  }
  return {
    title,
    sections: [
      section(heading, hour.plans, entry => entry.value),
      section('MEDICATION', hour.prescribed.medication, entry =>
        medicationLabel(entry.value)
      ),
      section('OXYTOCIN', hour.prescribed.oxytocin, oxytocinLabel),
      section('IV FLUIDS', hour.prescribed.ivFluids, ivFluidLabel),
    ],
  };
}
