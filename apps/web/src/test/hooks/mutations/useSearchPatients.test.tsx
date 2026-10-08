import { act, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, success } from '@ezazi/api-client';
import { useSearchPatients } from '../../../hooks/mutations/useSearchPatients';
import { patientService } from '../../../services/patient.service';
import { showToast } from '../../../services/toast';
import type { OpenMrsPatientSearchResult } from '../../../types/patient.types';

vi.mock('../../../services/patient.service', () => ({
  patientService: { searchPatients: vi.fn() },
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

function patient(
  uuid: string,
  identifiers: OpenMrsPatientSearchResult['identifiers']
): OpenMrsPatientSearchResult {
  return {
    uuid,
    identifiers,
    person: { display: `Patient ${uuid}`, gender: 'F', age: 30 },
  };
}

beforeEach(() => {
  vi.mocked(patientService.searchPatients).mockReset();
  vi.mocked(showToast).mockReset();
});

describe('useSearchPatients', () => {
  it('resolves to the matches, dropping patients that have no identifier', async () => {
    const withId = patient('pat-1', [
      { identifierType: { name: 'OpenMRS ID' }, identifier: '1000EWA' },
    ]);
    vi.mocked(patientService.searchPatients).mockResolvedValue(
      success([withId, patient('pat-2', [])])
    );

    const { result } = renderHook(() => useSearchPatients(), { wrapper });
    act(() => {
      result.current.mutate('Asha');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(patientService.searchPatients).toHaveBeenCalledWith('Asha');
    expect(result.current.data).toEqual([withId]);
  });

  it('shows an error toast when the search fails', async () => {
    vi.mocked(patientService.searchPatients).mockResolvedValue({
      ok: false,
      error: new ApiError('network', 'OpenMRS unreachable'),
    });

    const { result } = renderHook(() => useSearchPatients(), { wrapper });
    act(() => {
      result.current.mutate('Asha');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(showToast).toHaveBeenCalledWith(
      'Search Failed',
      'OpenMRS unreachable',
      'error'
    );
  });
});
