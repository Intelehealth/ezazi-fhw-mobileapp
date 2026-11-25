import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@ezazi/api-client';
import { visitService } from '../../services/visit.service';
import { valueText } from '../../modules/dashboard/elcg/elcg.mapper';
import type {
  OpenMrsAttribute,
  OpenMrsVisitDetail,
} from '../../types/visit.types';

/** The "Visit Read" visit attribute type, as partogram.component.ts posts it. */
export const VISIT_READ_ATTRIBUTE_TYPE = '2e4b62a5-aa71-43e2-abc9-f4a777697b19';

export interface MarkVisitSeenInput {
  visit: OpenMrsVisitDetail;
  viewerUuid: string;
}

/**
 * Ports partogram.component.ts's updateSeen(): opening a visit adds the
 * viewer to its "Visit Read" attribute — a comma-separated list of the first
 * segment of each viewer's uuid — creating the attribute on first read. The
 * dashboard reads the same list for its unseen-row highlight
 * (visit-row.mapper.ts), so its lists are refreshed once this lands. A
 * viewer already on the list sends nothing.
 *
 * The cached visit (['elcg-visit', uuid]) is patched with the saved
 * attribute straight away, then refetched: otherwise reopening the visit
 * within the cache window shows the copy read before this landed — with no
 * "Visit Read" attribute — and a second one would be POSTed.
 */
export function useMarkVisitSeen() {
  const queryClient = useQueryClient();

  return useMutation<OpenMrsAttribute | null, ApiError, MarkVisitSeenInput>({
    mutationFn: async ({ visit, viewerUuid }) => {
      const viewerId = viewerUuid.split('-')[0];
      const readBy = visit.attributes.find(
        attribute => attribute.attributeType.display === 'Visit Read'
      );
      const readers = readBy ? valueText(readBy.value) : '';
      if (readBy && readers.includes(viewerId)) return null;

      const value = readBy ? `${readers},${viewerId}` : viewerId;
      const result = readBy
        ? await visitService.updateVisitAttribute(visit.uuid, readBy.uuid, {
            attributeType: VISIT_READ_ATTRIBUTE_TYPE,
            value,
          })
        : await visitService.addVisitAttribute(visit.uuid, {
            attributeType: VISIT_READ_ATTRIBUTE_TYPE,
            value,
          });
      if (!result.ok) throw result.error;
      /* Built from what was sent: the response's representation may leave out the type's name. */
      return {
        uuid: result.data.uuid,
        value,
        attributeType: {
          uuid: VISIT_READ_ATTRIBUTE_TYPE,
          display: 'Visit Read',
        },
      };
    },
    onSuccess: (saved, { visit }) => {
      if (!saved) return;
      const visitKey = ['elcg-visit', visit.uuid];
      queryClient.setQueryData<OpenMrsVisitDetail>(visitKey, cached =>
        cached
          ? {
              ...cached,
              attributes: [
                ...cached.attributes.filter(a => a.uuid !== saved.uuid),
                saved,
              ],
            }
          : cached
      );
      void queryClient.invalidateQueries({ queryKey: visitKey });
      void queryClient.invalidateQueries({ queryKey: ['visits'] });
    },
  });
}
