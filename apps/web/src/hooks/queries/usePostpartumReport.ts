import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@ezazi/api-client';
import type { ObsChange } from '../../modules/dashboard/elcg/decisions/decision.rows';
import {
  POSTPARTUM_DECISION_CONCEPTS,
  applyPostpartumChanges,
  type PostpartumDecisionTarget,
} from '../../modules/dashboard/postpartum-report/postpartum-report.decisions';
import {
  USE_POSTPARTUM_MOCK,
  buildMockPostpartumReport,
} from '../../modules/dashboard/postpartum-report/postpartum-report.mock';
import type { PostpartumReportView } from '../../modules/dashboard/postpartum-report/postpartum-report.types';
import { useAppSelector } from '../../store/hooks';
import { saveObsChanges } from '../mutations/useSaveDecisions';

export interface SavePostpartumDecisionInput {
  target: PostpartumDecisionTarget;
  /* The patient's OpenMRS uuid — the person new obs are recorded for. */
  patientUuid: string;
  /* The latest encounter — new obs are recorded on it. */
  encounterUuid: string;
  changes: ObsChange[];
}

/*
 * The Postpartum Report for one visit, and the save behind its Add dialogs.
 *
 * Serves mock data for now (see postpartum-report.mock.ts), and saving
 * applies the dialog's changes to it in memory. Once real data is available,
 * read the DELIVERY_OUTCOME_STAGE3 and Stage3_Hour* encounters from the visit
 * here — the same visit query useElcgVisit uses — and map them into a
 * PostpartumReportView, as stage3.component.ts's readDeliveryOutcome() /
 * readStageData() do; saving then records the obs in OpenMRS (the same calls
 * as the LCG's dialogs) and reads the visit again.
 */
export function usePostpartumReport(visitUuid: string) {
  const viewer = useAppSelector(state => state.auth.user);
  const queryClient = useQueryClient();
  /* Read once per visit: the page is keyed by the visit uuid. */
  const [report, setReport] = useState<PostpartumReportView | null>(() =>
    USE_POSTPARTUM_MOCK && visitUuid
      ? buildMockPostpartumReport(visitUuid)
      : null
  );

  const save = useMutation<void, ApiError, SavePostpartumDecisionInput>({
    mutationFn: async ({ target, patientUuid, encounterUuid, changes }) => {
      if (USE_POSTPARTUM_MOCK) {
        setReport(
          current =>
            current &&
            applyPostpartumChanges(current, target, changes, {
              uuid: viewer?.uuid ?? '',
              name: viewer?.displayName ?? viewer?.username ?? '',
            })
        );
        return;
      }
      await saveObsChanges(changes, {
        concept: POSTPARTUM_DECISION_CONCEPTS[target.patient][target.kind],
        patientUuid,
        encounterUuid,
      });
    },
    onSettled: () => {
      if (USE_POSTPARTUM_MOCK) return;
      return queryClient.invalidateQueries({
        queryKey: ['elcg-visit', visitUuid],
      });
    },
  });

  return {
    /* Null when the visit has no postpartum monitoring to report. */
    report,
    saveDecision: save.mutate,
    isSavingDecision: save.isPending,
  };
}
