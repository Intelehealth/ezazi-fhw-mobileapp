import { act, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, success } from '@ezazi/api-client';
import { useOpenPatientVisit } from '../../../hooks/mutations/useOpenPatientVisit';
import { patientService } from '../../../services/patient.service';
import { showToast } from '../../../services/toast';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

vi.mock('../../../services/patient.service', () => ({
  patientService: { recentVisits: vi.fn() },
}));

vi.mock('../../../services/toast', () => ({ showToast: vi.fn() }));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  navigate.mockReset();
  vi.mocked(patientService.recentVisits).mockReset();
  vi.mocked(showToast).mockReset();
});

describe('useOpenPatientVisit', () => {
  it("opens the patient's most recent visit in the WHO LCG view and reports it", async () => {
    vi.mocked(patientService.recentVisits).mockResolvedValue(
      success([{ uuid: 'visit-2' }, { uuid: 'visit-1' }])
    );
    const onOpened = vi.fn();

    const { result } = renderHook(() => useOpenPatientVisit(onOpened), {
      wrapper,
    });
    act(() => {
      result.current.mutate('pat-1');
    });

    await waitFor(() => expect(onOpened).toHaveBeenCalledTimes(1));
    expect(patientService.recentVisits).toHaveBeenCalledWith('pat-1');
    expect(navigate).toHaveBeenCalledWith('/dashboard/elcg/visit-2');
  });

  it('warns instead of navigating when the patient has no visits', async () => {
    vi.mocked(patientService.recentVisits).mockResolvedValue(success([]));
    const onOpened = vi.fn();

    const { result } = renderHook(() => useOpenPatientVisit(onOpened), {
      wrapper,
    });
    act(() => {
      result.current.mutate('pat-1');
    });

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        'No Visits',
        'This patient has no visits yet.',
        'warning'
      )
    );
    expect(navigate).not.toHaveBeenCalled();
    expect(onOpened).not.toHaveBeenCalled();
  });

  it('shows an error toast when the visit lookup fails', async () => {
    vi.mocked(patientService.recentVisits).mockResolvedValue({
      ok: false,
      error: new ApiError('network', 'OpenMRS unreachable'),
    });

    const { result } = renderHook(() => useOpenPatientVisit(vi.fn()), {
      wrapper,
    });
    act(() => {
      result.current.mutate('pat-1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(showToast).toHaveBeenCalledWith(
      'Could Not Open Patient',
      'OpenMRS unreachable',
      'error'
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});
