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

/** Where a dialog's new obs go. */
export interface ObsChangeTarget {
  concept: string;
  patientUuid: string;
  /** The latest encounter — new obs are recorded on it. */
  encounterUuid: string;
}

function applyChange(
  change: ObsChange,
  { concept, patientUuid, encounterUuid }: ObsChangeTarget
): Promise<ApiResult<unknown>> {
  switch (change.action) {
    case 'create':
      return obsService.createObs({
        concept,
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
 * Creates, updates and voids every obs of a saved decision dialog at once —
 * the Angular handlers' loop over the dialog's result. Throws the first
 * failure once all have settled, so whatever could save did.
 */
export async function saveObsChanges(
  changes: ObsChange[],
  target: ObsChangeTarget
): Promise<void> {
  const results = await Promise.all(
    changes.map(change => applyChange(change, target))
  );
  const failed = results.find(result => !result.ok);
  if (failed && !failed.ok) throw failed.error;
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
    mutationFn: ({ changes, kind, patientUuid, encounterUuid }) =>
      saveObsChanges(changes, {
        concept: DECISION_CONCEPTS[kind],
        patientUuid,
        encounterUuid,
      }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['elcg-visit', visitUuid] }),
  });
}
