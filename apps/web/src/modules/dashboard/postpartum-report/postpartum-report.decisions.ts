import type { ObsChange } from '../elcg/decisions/decision.rows';
import type { LcgDecisionSource, LcgNoteEntry } from '../elcg/elcg.types';
import type {
  PostpartumNote,
  PostpartumNoteKind,
  PostpartumNoteRow,
  PostpartumPatient,
  PostpartumReportView,
} from './postpartum-report.types';

/*
 * The concept each postpartum Add dialog records — stage3.component.ts's
 * conceptAssessmentMother / conceptPlanMother / conceptAssessmentNewborn /
 * conceptPlanNewborn.
 */
export const POSTPARTUM_DECISION_CONCEPTS: Record<
  PostpartumPatient,
  Record<PostpartumNoteKind, string>
> = {
  mother: {
    assessment: '67a050c1-35e5-451c-a4ab-fff9d57b0db1',
    plan: '162169AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
  newborn: {
    assessment: '15fc4eca-7635-4e7c-baa4-20c250cfe62a',
    plan: 'a79853d9-e45e-41b2-8473-b19e5cae66cb',
  },
};

/* Which decision an Add dialog edits. */
export interface PostpartumDecisionTarget {
  patient: PostpartumPatient;
  kind: PostpartumNoteKind;
}

const SECTION_OF = { mother: 'maternal', newborn: 'newborn' } as const;

function noteRow(
  report: PostpartumReportView,
  { patient, kind }: PostpartumDecisionTarget
): PostpartumNoteRow | undefined {
  return report[SECTION_OF[patient]].find(
    (row): row is PostpartumNoteRow => row.kind === 'notes' && row.key === kind
  );
}

const newestFirst = (a: PostpartumNote, b: PostpartumNote) =>
  Date.parse(b.obsDatetime) - Date.parse(a.obsDatetime);

/*
 * The column of the latest recorded encounter — stage3.component.ts's
 * getLatestStage3ColumnIndex(): every decision is recorded against it.
 * -1 while nothing has been recorded.
 */
export function latestEncounterColumn(report: PostpartumReportView): number {
  for (let index = report.columns.length - 1; index >= 0; index--) {
    if (report.columns[index].encounterUuid) return index;
  }
  return -1;
}

/* A decision's whole history, newest first — getTextareaHistory(). */
export function postpartumDecisionHistory(
  report: PostpartumReportView,
  target: PostpartumDecisionTarget
): PostpartumNote[] {
  return (noteRow(report, target)?.values.flat() ?? []).sort(newestFirst);
}

/*
 * What an Add dialog opens with — addAssessment() / prescribePlan()'s
 * `historyData` (every entry) and `currentEncData` (the entries on the
 * latest encounter, which the signed-in user may still edit).
 */
export function postpartumDecisionSource(
  report: PostpartumReportView,
  target: PostpartumDecisionTarget
): LcgDecisionSource<LcgNoteEntry> {
  const column = latestEncounterColumn(report);
  const current =
    column === -1 ? [] : (noteRow(report, target)?.values[column] ?? []);
  return {
    history: postpartumDecisionHistory(report, target),
    current: [...current].sort(newestFirst),
  };
}

/* The signed-in user, as a saved note signs them. */
export interface PostpartumViewer {
  uuid: string;
  name: string;
}

/*
 * The report with a saved dialog's changes applied, as stage3.component.ts
 * patches `param.values` after each obs call: new notes join the latest
 * encounter's column, updated ones take their new value, voided ones go.
 * Used while the report runs on mock data, where nothing reaches OpenMRS.
 */
export function applyPostpartumChanges(
  report: PostpartumReportView,
  target: PostpartumDecisionTarget,
  changes: ObsChange[],
  viewer: PostpartumViewer,
  now = new Date()
): PostpartumReportView {
  const latest = latestEncounterColumn(report);
  const section = SECTION_OF[target.patient];

  const rows = report[section].map(row => {
    if (row.kind !== 'notes' || row.key !== target.kind) return row;

    const values = row.values.map(notes =>
      notes.flatMap(note => {
        const change = changes.find(
          c => c.action !== 'create' && c.uuid === note.uuid
        );
        if (!change) return [note];
        return change.action === 'delete'
          ? []
          : [{ ...note, value: change.value }];
      })
    );
    changes.forEach((change, index) => {
      if (change.action !== 'create' || latest === -1) return;
      values[latest] = [
        ...values[latest],
        {
          uuid: `mock-obs-${now.getTime()}-${index}`,
          value: change.value,
          initial: viewer.name,
          obsDatetime: now.toISOString(),
          creatorUuid: viewer.uuid,
        },
      ];
    });
    return { ...row, values };
  });

  return { ...report, [section]: rows };
}
