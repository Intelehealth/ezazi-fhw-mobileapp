import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@ezazi/api-client';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes/paths';
import { patientService } from '../../services/patient.service';
import { showToast } from '../../services/toast';

/**
 * Ports searched-patients.component.ts's view(): looks up the patient's
 * visits and opens the first one (the most recent) in the WHO LCG view. The
 * Angular source indexes `results[0]` blindly; a patient with no visits gets
 * a warning toast here instead of an error.
 */
export function useOpenPatientVisit(onOpened: () => void) {
  const navigate = useNavigate();

  return useMutation<string | null, Error | ApiError, string>({
    mutationFn: async patientUuid => {
      const result = await patientService.recentVisits(patientUuid);
      if (!result.ok) throw result.error;
      return result.data[0]?.uuid ?? null;
    },
    onSuccess: visitUuid => {
      if (!visitUuid) {
        showToast('No Visits', 'This patient has no visits yet.', 'warning');
        return;
      }
      navigate(`${ROUTES.DASHBOARD_ELCG}/${visitUuid}`);
      onOpened();
    },
    onError: error => {
      showToast('Could Not Open Patient', error.message, 'error');
    },
  });
}
