import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ApiError, NetworkError, failure, success } from '@ezazi/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useElcgVisit } from '../../../hooks/queries/useElcgVisit';
import { patientService } from '../../../services/patient.service';
import { visitService } from '../../../services/visit.service';
import { useAppSelector } from '../../../store/hooks';
import {
  buildEncounter,
  buildObs,
  buildVisitDetail,
} from '../../fixtures/openmrs-visit';

vi.mock('../../../services/visit.service', () => ({
  visitService: {
    getVisitDetails: vi.fn(),
    addVisitAttribute: vi.fn(),
    updateVisitAttribute: vi.fn(),
  },
}));

vi.mock('../../../services/patient.service', () => ({
  patientService: { recentVisits: vi.fn() },
}));

/* Mocked for the dual-React reason explained in dashboard.page.test.tsx. */
vi.mock('../../../store/hooks', () => ({ useAppSelector: vi.fn() }));

const VIEWER = 'abc12345-1111-2222-3333-444455556666';

function wrapper({ children }: { children: ReactNode }) {
  /*
   * A fresh client per test. retryDelay 0 keeps the hook's own retry policy
   * (which kinds, how many times) without waiting out its backoff.
   */
  const client = new QueryClient({
    defaultOptions: { queries: { retryDelay: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const VISIT = buildVisitDetail({
  encounters: [
    buildEncounter('Stage1_Hour1_1', '2026-11-02T00:00:00.000Z', [
      buildObs('PULSE', '88'),
    ]),
  ],
});

beforeEach(() => {
  vi.mocked(visitService.getVisitDetails).mockReset();
  vi.mocked(visitService.addVisitAttribute).mockReset();
  vi.mocked(visitService.addVisitAttribute).mockResolvedValue(
    success({
      uuid: 'attr-1',
      value: 'abc12345',
      attributeType: { display: 'Visit Read' },
    })
  );
  vi.mocked(patientService.recentVisits).mockReset();
  vi.mocked(patientService.recentVisits).mockResolvedValue(success([]));
  vi.mocked(useAppSelector).mockImplementation(selector =>
    selector({
      auth: {
        user: {
          uuid: VIEWER,
          username: 'doctor1',
          displayName: 'Dr. Sameer Joshi',
          roles: [],
          providerUuid: 'p-1',
          personUuid: 'per-1',
        },
        token: null,
        isAuthenticated: true,
      },
      config: { data: null, error: null, lastFetched: null },
    })
  );
});

describe('useElcgVisit', () => {
  it('loads the visit from OpenMRS and maps it into the guide', async () => {
    vi.mocked(visitService.getVisitDetails).mockResolvedValue(success(VISIT));

    const { result } = renderHook(() => useElcgVisit('visit-1'), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.view).not.toBeNull());
    expect(visitService.getVisitDetails).toHaveBeenCalledWith('visit-1');
    expect(result.current.view?.patient.name).toBe('Asha Devi');
    expect(result.current.view?.readings.pulse.stage1[0]).toEqual({
      value: '88',
      alert: null,
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("counts the patient's other visits for View Past Details", async () => {
    vi.mocked(visitService.getVisitDetails).mockResolvedValue(success(VISIT));
    vi.mocked(patientService.recentVisits).mockResolvedValue(
      success([{ uuid: 'visit-1' }, { uuid: 'visit-0' }, { uuid: 'visit-x' }])
    );

    const { result } = renderHook(() => useElcgVisit('visit-1'), { wrapper });

    await waitFor(() => expect(result.current.view?.pastVisitsCount).toBe(2));
    expect(patientService.recentVisits).toHaveBeenCalledWith(
      'pat-1',
      'custom:(uuid)'
    );
  });

  it('still shows the guide when the past visits cannot be counted', async () => {
    vi.mocked(visitService.getVisitDetails).mockResolvedValue(success(VISIT));
    vi.mocked(patientService.recentVisits).mockResolvedValue(
      failure(new ApiError('api', 'Forbidden', { status: 403 }))
    );

    const { result } = renderHook(() => useElcgVisit('visit-1'), { wrapper });

    await waitFor(() => expect(patientService.recentVisits).toHaveBeenCalled());
    expect(result.current.view?.pastVisitsCount).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('marks the visit read by the signed-in user, once', async () => {
    vi.mocked(visitService.getVisitDetails).mockResolvedValue(success(VISIT));

    const { result } = renderHook(() => useElcgVisit('visit-1'), { wrapper });
    await waitFor(() =>
      expect(visitService.addVisitAttribute).toHaveBeenCalledTimes(1)
    );
    expect(visitService.addVisitAttribute).toHaveBeenCalledWith(
      'visit-1',
      expect.objectContaining({ value: 'abc12345' })
    );

    act(() => result.current.retry());
    await waitFor(() =>
      expect(visitService.getVisitDetails).toHaveBeenCalledTimes(2)
    );
    expect(visitService.addVisitAttribute).toHaveBeenCalledTimes(1);
  });

  it('retries a network failure, then reports it and retries on request', async () => {
    vi.mocked(visitService.getVisitDetails).mockResolvedValue(
      failure(new NetworkError())
    );

    const { result } = renderHook(() => useElcgVisit('visit-1'), { wrapper });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    /* The first try and two automatic retries. */
    expect(visitService.getVisitDetails).toHaveBeenCalledTimes(3);
    expect(result.current.view).toBeNull();
    expect(result.current.error?.kind).toBe('network');

    vi.mocked(visitService.getVisitDetails).mockResolvedValue(success(VISIT));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.view).not.toBeNull());
  });

  it('does not retry a visit the server refuses', async () => {
    vi.mocked(visitService.getVisitDetails).mockResolvedValue(
      failure(new ApiError('api', 'Not found', { status: 404 }))
    );

    const { result } = renderHook(() => useElcgVisit('missing'), { wrapper });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(visitService.getVisitDetails).toHaveBeenCalledTimes(1);
    expect(visitService.addVisitAttribute).not.toHaveBeenCalled();
  });
});
