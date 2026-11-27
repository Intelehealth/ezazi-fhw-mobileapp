import { useEffect, useMemo, useRef } from 'react';
import { skipToken, useQuery } from '@tanstack/react-query';
import type { ApiError } from '@ezazi/api-client';
import { patientService } from '../../services/patient.service';
import { visitService } from '../../services/visit.service';
import { useAppSelector } from '../../store/hooks';
import { mapVisitToElcgView } from '../../modules/dashboard/elcg/elcg.mapper';
import type { ElcgView } from '../../modules/dashboard/elcg/elcg.types';
import type { OpenMrsVisitDetail } from '../../types/visit.types';
import { useMarkVisitSeen } from '../mutations/useMarkVisitSeen';

/* Failures worth retrying automatically; a 4xx or an expired session is not. */
const RETRYABLE_KINDS = new Set(['network', 'timeout', 'server']);
const MAX_RETRIES = 2;

function retryable(failureCount: number, error: ApiError): boolean {
  return failureCount < MAX_RETRIES && RETRYABLE_KINDS.has(error.kind);
}

export interface ElcgVisitState {
  /** Null until the visit has loaded. */
  view: ElcgView | null;
  isLoading: boolean;
  /** Loading the visit failed. */
  error: ApiError | null;
  retry: () => void;
}

/**
 * The WHO Labour Care Guide for one visit — ports partogram.component.ts's
 * getVisit(): the visit with every encounter (VisitService.fetchVisitDetails),
 * mapped into the screen's ElcgView, plus the patient's other visits for
 * "View Past Details" (loadPastVisitsCount — a failure there just counts 0).
 * Once loaded, the visit is marked read by the signed-in user (updateSeen).
 */
export function useElcgVisit(visitUuid: string): ElcgVisitState {
  const viewerUuid = useAppSelector(state => state.auth.user?.uuid);

  const visitQuery = useQuery<OpenMrsVisitDetail, ApiError>({
    queryKey: ['elcg-visit', visitUuid],
    enabled: Boolean(visitUuid),
    queryFn: async () => {
      const result = await visitService.getVisitDetails(visitUuid);
      if (!result.ok) throw result.error;
      return result.data;
    },
    retry: retryable,
  });

  const visit = visitQuery.data;
  const patientUuid = visit?.patient.uuid;

  const pastVisitsQuery = useQuery<number, ApiError>({
    queryKey: ['patient-visit-count', patientUuid, visitUuid],
    /* Waits for the visit to name its patient. */
    queryFn: patientUuid
      ? async () => {
          const result = await patientService.recentVisits(
            patientUuid,
            'custom:(uuid)'
          );
          if (!result.ok) throw result.error;
          return result.data.filter(other => other.uuid !== visitUuid).length;
        }
      : skipToken,
    retry: retryable,
  });
  const pastVisitsCount = pastVisitsQuery.data ?? 0;

  const view = useMemo(
    () =>
      visit
        ? mapVisitToElcgView(visit, {
            pastVisitsCount,
            /* Angular's `environment.hasStage3` — on for every client. */
            hasStage3: true,
          })
        : null,
    [visit, pastVisitsCount]
  );

  const { mutate: markSeen } = useMarkVisitSeen();
  /* Once per visit opened, not on every refetch. */
  const markedVisit = useRef<string | null>(null);
  useEffect(() => {
    if (!visit || !viewerUuid || markedVisit.current === visit.uuid) return;
    markedVisit.current = visit.uuid;
    markSeen({ visit, viewerUuid });
  }, [visit, viewerUuid, markSeen]);

  return {
    view,
    isLoading: visitQuery.isPending,
    error: visitQuery.error,
    retry: () => void visitQuery.refetch(),
  };
}
