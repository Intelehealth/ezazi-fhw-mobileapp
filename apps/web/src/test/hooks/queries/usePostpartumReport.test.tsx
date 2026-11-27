import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ServerError } from '@ezazi/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveObsChanges } from '../../../hooks/mutations/useSaveDecisions';
import { usePostpartumReport } from '../../../hooks/queries/usePostpartumReport';
import { postpartumDecisionHistory } from '../../../modules/dashboard/postpartum-report/postpartum-report.decisions';

/* USE_POSTPARTUM_MOCK is a constant; a getter lets a test switch it off. */
const flags = vi.hoisted(() => ({ mock: true }));
vi.mock(
  '../../../modules/dashboard/postpartum-report/postpartum-report.mock',
  async importOriginal => ({
    ...(await importOriginal<object>()),
    get USE_POSTPARTUM_MOCK() {
      return flags.mock;
    },
  })
);

const auth = vi.hoisted(() => ({
  user: null as {
    uuid: string;
    displayName?: string;
    username?: string;
  } | null,
}));
vi.mock('../../../store/hooks', () => ({
  useAppSelector: (select: (state: unknown) => unknown) => select({ auth }),
}));

/* The OpenMRS calls themselves have their own suite (useSaveDecisions.test.tsx). */
vi.mock('../../../hooks/mutations/useSaveDecisions', () => ({
  saveObsChanges: vi.fn(),
}));

const MOTHER_PLAN = { patient: 'mother', kind: 'plan' } as const;
const SAVE = {
  target: MOTHER_PLAN,
  patientUuid: 'patient-1',
  encounterUuid: 'enc-latest',
  changes: [{ action: 'create' as const, value: 'Review in 30 min' }],
};

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  flags.mock = true;
  auth.user = { uuid: 'doctor-1', displayName: 'Dr. Meera Rao' };
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  vi.mocked(saveObsChanges).mockReset().mockResolvedValue(undefined);
});

describe('usePostpartumReport — on mock data', () => {
  it("serves the visit's mock report", () => {
    const { result } = renderHook(() => usePostpartumReport('visit-9'), {
      wrapper,
    });

    expect(result.current.report?.visitUuid).toBe('visit-9');
  });

  it('has no report without a visit', () => {
    const { result } = renderHook(() => usePostpartumReport(''), { wrapper });

    expect(result.current.report).toBeNull();
  });

  it('saves into the mock, signed by the viewer, without calling OpenMRS', async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePostpartumReport('visit-1'), {
      wrapper,
    });

    act(() => result.current.saveDecision(SAVE));

    await waitFor(() =>
      expect(
        postpartumDecisionHistory(result.current.report!, MOTHER_PLAN)[0]
      ).toMatchObject({
        value: 'Review in 30 min',
        initial: 'Dr. Meera Rao',
        creatorUuid: 'doctor-1',
      })
    );
    expect(saveObsChanges).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('signs with the username when the viewer has no display name', async () => {
    auth.user = { uuid: 'doctor-2', username: 'drrao' };
    const { result } = renderHook(() => usePostpartumReport('visit-1'), {
      wrapper,
    });

    act(() => result.current.saveDecision(SAVE));

    await waitFor(() =>
      expect(
        postpartumDecisionHistory(result.current.report!, MOTHER_PLAN)[0]
          .initial
      ).toBe('drrao')
    );
  });

  it('signs with nothing when no one is signed in', async () => {
    auth.user = null;
    const { result } = renderHook(() => usePostpartumReport('visit-1'), {
      wrapper,
    });

    act(() => result.current.saveDecision(SAVE));

    await waitFor(() =>
      expect(
        postpartumDecisionHistory(result.current.report!, MOTHER_PLAN)[0]
      ).toMatchObject({ initial: '', creatorUuid: '' })
    );
  });

  it('ignores a save while there is no report', async () => {
    const { result } = renderHook(() => usePostpartumReport(''), { wrapper });

    act(() => result.current.saveDecision(SAVE));

    await waitFor(() => expect(result.current.isSavingDecision).toBe(false));
    expect(result.current.report).toBeNull();
  });
});

describe('usePostpartumReport — on OpenMRS', () => {
  beforeEach(() => {
    flags.mock = false;
  });

  it('has no report until the visit is read', () => {
    const { result } = renderHook(() => usePostpartumReport('visit-1'), {
      wrapper,
    });

    expect(result.current.report).toBeNull();
  });

  it("records the obs on the decision's own concept, then reads the visit again", async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePostpartumReport('visit-1'), {
      wrapper,
    });

    act(() =>
      result.current.saveDecision({
        ...SAVE,
        target: { patient: 'newborn', kind: 'assessment' },
      })
    );

    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    expect(saveObsChanges).toHaveBeenCalledWith(SAVE.changes, {
      concept: '15fc4eca-7635-4e7c-baa4-20c250cfe62a',
      patientUuid: 'patient-1',
      encounterUuid: 'enc-latest',
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['elcg-visit', 'visit-1'],
    });
  });

  it('reports a failed save, and still reads the visit again', async () => {
    const error = new ServerError();
    vi.mocked(saveObsChanges).mockRejectedValue(error);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const onError = vi.fn();
    const { result } = renderHook(() => usePostpartumReport('visit-1'), {
      wrapper,
    });

    act(() => result.current.saveDecision(SAVE, { onError }));

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError.mock.calls[0][0]).toBe(error);
    expect(invalidate).toHaveBeenCalled();
  });
});
