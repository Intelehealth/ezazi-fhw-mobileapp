import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ServerError, failure, success } from '@ezazi/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSaveDecisions } from '../../../hooks/mutations/useSaveDecisions';
import { DECISION_CONCEPTS } from '../../../modules/dashboard/elcg/decisions/decision.catalog';
import { obsService } from '../../../services/obs.service';

vi.mock('../../../services/obs.service', () => ({
  obsService: { createObs: vi.fn(), updateObs: vi.fn(), deleteObs: vi.fn() },
}));

const SAVED = { uuid: 'obs-new', value: 'x', obsDatetime: '2026-11-02T00:00Z' };
const TARGET = {
  kind: 'plan' as const,
  patientUuid: 'patient-1',
  encounterUuid: 'enc-latest',
};

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  vi.mocked(obsService.createObs).mockReset().mockResolvedValue(success(SAVED));
  vi.mocked(obsService.updateObs).mockReset().mockResolvedValue(success(SAVED));
  vi.mocked(obsService.deleteObs).mockReset().mockResolvedValue(success(null));
});

describe('useSaveDecisions', () => {
  it("creates, updates and voids each row's obs, then reads the visit again", async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSaveDecisions('visit-1'), {
      wrapper,
    });

    act(() =>
      result.current.mutate({
        ...TARGET,
        changes: [
          { action: 'create', value: 'Encourage mobility' },
          { action: 'update', uuid: 'obs-1', value: 'Rest' },
          { action: 'delete', uuid: 'obs-2' },
        ],
      })
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(obsService.createObs).toHaveBeenCalledWith({
      concept: DECISION_CONCEPTS.plan,
      person: 'patient-1',
      obsDatetime: expect.any(String),
      value: 'Encourage mobility',
      encounter: 'enc-latest',
    });
    expect(obsService.updateObs).toHaveBeenCalledWith('obs-1', {
      value: 'Rest',
    });
    expect(obsService.deleteObs).toHaveBeenCalledWith('obs-2');
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['elcg-visit', 'visit-1'],
    });
  });

  it('fails when any change fails, and still reads the visit again', async () => {
    vi.mocked(obsService.deleteObs).mockResolvedValue(
      failure(new ServerError())
    );
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSaveDecisions('visit-1'), {
      wrapper,
    });

    act(() =>
      result.current.mutate({
        ...TARGET,
        changes: [
          { action: 'create', value: 'Rest' },
          { action: 'delete', uuid: 'obs-2' },
        ],
      })
    );
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ServerError);
    expect(obsService.createObs).toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalled();
  });
});
