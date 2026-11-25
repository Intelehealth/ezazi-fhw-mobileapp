import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError, ApiResult } from '@ezazi/api-client';
import { obsService } from '../../services/obs.service';
import { DECISION_CONCEPTS } from '../../modules/dashboard/elcg/decisions/decision.catalog';
import type { ObsChange } from '../../modules/dashboard/elcg/decisions/decision.rows';
import type { LcgDecisionKind } from '../../modules/dashboard/elcg/elcg.types';

export interface SaveDecisionsInput {
  kind: LcgDecisionKind;
  patientUuid: string;
  /** The latest Stage / SOS encounter — new obs are recorded on it. */
  encounterUuid: string;
  changes: ObsChange[];
}

function applyChange(
  change: ObsChange,
  { kind, patientUuid, encounterUuid }: Omit<SaveDecisionsInput, 'changes'>
): Promise<ApiResult<unknown>> {
  switch (change.action) {
    case 'create':
      return obsService.createObs({
        concept: DECISION_CONCEPTS[kind],
        person: patientUuid,
        obsDatetime: new Date().toISOString(),
        value: change.value,
        encounter: encounterUuid,
      });
    case 'update':
      return obsService.updateObs(change.uuid, { value: change.value });
    case 'delete':
      return obsService.deleteObs(change.uuid);
  }
}

/**
 * Ports partogram.component.ts's addAssessment() / prescribePlan() /
 * prescribeMedication() / prescribeOxytocin() / prescribeIvFluid() once
 * their dialog closes with a result: every row's obs is created, updated or
 * voided at once, then the visit is read again so the guide and the Shared
 * Decision Making card show what OpenMRS now holds — including whatever did
 * save when another change failed.
 */
export function useSaveDecisions(visitUuid: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, SaveDecisionsInput>({
    mutationFn: async ({ changes, ...target }) => {
      const results = await Promise.all(
        changes.map(change => applyChange(change, target))
      );
      const failed = results.find(result => !result.ok);
      if (failed && !failed.ok) throw failed.error;
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['elcg-visit', visitUuid] }),
  });
}
