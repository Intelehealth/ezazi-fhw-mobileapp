import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ServerError, failure, success } from '@ezazi/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  VISIT_READ_ATTRIBUTE_TYPE,
  useMarkVisitSeen,
} from '../../../hooks/mutations/useMarkVisitSeen';
import { visitService } from '../../../services/visit.service';
import { buildVisitDetail } from '../../fixtures/openmrs-visit';

vi.mock('../../../services/visit.service', () => ({
  visitService: { addVisitAttribute: vi.fn(), updateVisitAttribute: vi.fn() },
}));

const VIEWER = 'abc12345-1111-2222-3333-444455556666';

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function readBy(value: string) {
  return buildVisitDetail({
    attributes: [
      {
        uuid: 'attr-read',
        value,
        attributeType: {
          uuid: VISIT_READ_ATTRIBUTE_TYPE,
          display: 'Visit Read',
        },
      },
    ],
  });
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  vi.mocked(visitService.addVisitAttribute).mockReset();
  vi.mocked(visitService.updateVisitAttribute).mockReset();
});

describe('useMarkVisitSeen', () => {
  it('creates the "Visit Read" attribute on a visit nobody has opened', async () => {
    vi.mocked(visitService.addVisitAttribute).mockResolvedValue(
      success({
        uuid: 'attr-1',
        value: 'abc12345',
        attributeType: { display: 'Visit Read' },
      })
    );
    const { result } = renderHook(() => useMarkVisitSeen(), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        visit: buildVisitDetail(),
        viewerUuid: VIEWER,
      })
    );

    expect(visitService.addVisitAttribute).toHaveBeenCalledWith('visit-1', {
      attributeType: VISIT_READ_ATTRIBUTE_TYPE,
      value: 'abc12345',
    });
  });

  it('adds the viewer to the readers already listed', async () => {
    vi.mocked(visitService.updateVisitAttribute).mockResolvedValue(
      success({
        uuid: 'attr-read',
        value: '',
        attributeType: { display: 'Visit Read' },
      })
    );
    const { result } = renderHook(() => useMarkVisitSeen(), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        visit: readBy('ffff0000'),
        viewerUuid: VIEWER,
      })
    );

    expect(visitService.updateVisitAttribute).toHaveBeenCalledWith(
      'visit-1',
      'attr-read',
      { attributeType: VISIT_READ_ATTRIBUTE_TYPE, value: 'ffff0000,abc12345' }
    );
  });

  it('sends nothing when the viewer has already read the visit', async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useMarkVisitSeen(), { wrapper });

    const changed = await act(() =>
      result.current.mutateAsync({
        visit: readBy('ffff0000,abc12345'),
        viewerUuid: VIEWER,
      })
    );

    expect(changed).toBe(false);
    expect(visitService.addVisitAttribute).not.toHaveBeenCalled();
    expect(visitService.updateVisitAttribute).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("refreshes the dashboard's lists so the visit no longer shows as unseen", async () => {
    vi.mocked(visitService.addVisitAttribute).mockResolvedValue(
      success({
        uuid: 'attr-1',
        value: 'abc12345',
        attributeType: { display: 'Visit Read' },
      })
    );
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useMarkVisitSeen(), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        visit: buildVisitDetail(),
        viewerUuid: VIEWER,
      })
    );

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['visits'] });
  });

  it('reports a failed write', async () => {
    vi.mocked(visitService.addVisitAttribute).mockResolvedValue(
      failure(new ServerError('Internal server error'))
    );
    const { result } = renderHook(() => useMarkVisitSeen(), { wrapper });

    act(() =>
      result.current.mutate({ visit: buildVisitDetail(), viewerUuid: VIEWER })
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.kind).toBe('server');
  });
});
