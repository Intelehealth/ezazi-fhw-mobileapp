import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@ezazi/api-client';
import { patientService } from '../../services/patient.service';
import { showToast } from '../../services/toast';
import type { OpenMrsPatientSearchResult } from '../../types/patient.types';

/**
 * Ports main-container.component.ts's search() request/response handling:
 * patients without any identifier are dropped from the results, exactly like
 * the Angular source's `value.identifiers.length` filter.
 */
export function useSearchPatients() {
  return useMutation<OpenMrsPatientSearchResult[], Error | ApiError, string>({
    mutationFn: async keyword => {
      const result = await patientService.searchPatients(keyword);
      if (!result.ok) throw result.error;
      return result.data.filter(patient => patient.identifiers.length > 0);
    },
    onError: error => {
      showToast('Search Failed', error.message, 'error');
    },
  });
}
