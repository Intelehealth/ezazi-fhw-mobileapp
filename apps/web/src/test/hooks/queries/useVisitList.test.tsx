import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ApiError, failure, NetworkError, success } from '@ezazi/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useVisitList,
  VISITS_PER_REQUEST,
} from '../../../hooks/queries/useVisitList';
import { visitService } from '../../../services/visit.service';
import type {
  PortalVisit,
  VisitListResponse,
} from '../../../types/visit.types';

vi.mock('../../../services/visit.service', () => ({
  visitService: { getVisits: vi.fn() },
}));

vi.mock('../../../services/http', () => ({
  getOpenMrsBaseUrl: () => 'https://openmrs.test',
}));

function portalVisit(id: number): PortalVisit {
  return {
    visit_id: id,
    uuid: `visit-${id}`,
    date_started: '2026-10-22T03:45:00.000Z',
    date_stopped: null,
    voided: false,
    encounters: [],
    patient: { identifier: `ELCG-${id}` },
    patient_name: { given_name: 'Asha', family_name: `No${id}` },
    person: { uuid: `per-${id}`, gender: 'F', birthdate: null },
    attributes: [],
  };
}

function page(ids: number[], totalCount: number): VisitListResponse {
  return {
    count: ids.length,
    totalCount,
    data: ids.map(portalVisit),
    success: true,
  };
}

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

const getVisits = vi.mocked(visitService.getVisits);

beforeEach(() => {
  getVisits.mockReset();
});

describe('useVisitList', () => {
  it('loads the first page for the section and facility, mapped into rows', async () => {
    getVisits.mockResolvedValue(success(page([3, 2], 2)));

    const { result } = renderHook(
      () =>
        useVisitList('priority', {
          facilityUuid: 'fac-1',
          viewerUuid: 'u-1',
          enabled: true,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getVisits).toHaveBeenCalledWith('priority', {
      page: 1,
      limit: VISITS_PER_REQUEST,
      facilityUuid: 'fac-1',
    });
    expect(result.current.rows.map(r => r.patient.identifier)).toEqual([
      'ELCG-3',
      'ELCG-2',
    ]);
    expect(result.current.rows[0].patient.avatarUrl).toBe(
      'https://openmrs.test/personimage/per-3'
    );
    expect(result.current.totalCount).toBe(2);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches nothing while disabled, and reports loading', () => {
    const { result } = renderHook(
      () => useVisitList('priority', { enabled: false }),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);
    expect(getVisits).not.toHaveBeenCalled();
  });

  it('loads the next page on demand, appending rows and dropping repeats', async () => {
    getVisits
      .mockResolvedValueOnce(success(page([5, 4, 3], 6)))
      /* Visit 3 shifted onto page 2 after a new visit arrived — shown once. */
      .mockResolvedValueOnce(success(page([3, 2, 1], 6)));

    const { result } = renderHook(
      () => useVisitList('in-progress', { enabled: true }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.rows).toHaveLength(5));
    expect(getVisits).toHaveBeenLastCalledWith('in-progress', {
      page: 2,
      limit: VISITS_PER_REQUEST,
      facilityUuid: undefined,
    });
    expect(result.current.hasMore).toBe(false);
  });

  it('does not retry a request the server rejected, and exposes the error', async () => {
    getVisits.mockResolvedValue(
      failure(new ApiError('api', 'Invalid input', { status: 400 }))
    );

    const { result } = renderHook(
      () => useVisitList('completed', { enabled: true }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe('Invalid input');
    expect(getVisits).toHaveBeenCalledTimes(1);
  });

  it('retries a network failure twice before giving up', async () => {
    getVisits.mockResolvedValue(failure(new NetworkError()));

    const { result } = renderHook(
      () => useVisitList('completed', { enabled: true }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.error?.kind).toBe('network'));
    expect(getVisits).toHaveBeenCalledTimes(3);
  });

  it('retry() refetches after a failure', async () => {
    getVisits
      .mockResolvedValueOnce(
        failure(new ApiError('api', 'Bad request', { status: 400 }))
      )
      .mockResolvedValueOnce(success(page([1], 1)));

    const { result } = renderHook(
      () => useVisitList('completed', { enabled: true }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(result.current.error).toBeNull();
  });

  it('keeps the loaded rows and reports loadMoreError when the next page fails', async () => {
    getVisits
      .mockResolvedValueOnce(success(page([4, 3], 4)))
      .mockResolvedValueOnce(
        failure(new ApiError('api', 'Bad request', { status: 400 }))
      );

    const { result } = renderHook(
      () => useVisitList('priority', { enabled: true }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.loadMoreError).not.toBeNull());
    expect(result.current.rows).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });
});
