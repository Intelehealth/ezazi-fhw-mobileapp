import {
  failure,
  mapAxiosError,
  success,
  type ApiResult,
} from '@ezazi/api-client';
import { openMrsHttpClient } from './http';
import type {
  OpenMrsPatientSearchResult,
  OpenMrsPatientVisit,
} from '../types/patient.types';

/** Matches main-container.component.ts's own search `v=custom:(...)` representation string. */
const PATIENT_SEARCH_REPRESENTATION =
  'custom:(uuid,identifiers:(identifierType:(name),identifier),person)';

/**
 * Ports the OpenMRS calls behind the Angular header's global patient search
 * (main-container.component.ts's search() and VisitService.recentVisits).
 */
export const patientService = {
  /** GET {OPENMRS_URL}/patient?q={keyword}&v=… — the header search box. */
  async searchPatients(
    keyword: string
  ): Promise<ApiResult<OpenMrsPatientSearchResult[]>> {
    try {
      const { data } = await openMrsHttpClient.get<{
        results: OpenMrsPatientSearchResult[];
      }>('/patient', {
        params: { q: keyword, v: PATIENT_SEARCH_REPRESENTATION },
      });
      return success(data.results);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },

  /** GET {OPENMRS_URL}/visit?patient={uuid}&v=full — VisitService.recentVisits, newest visit first. */
  async recentVisits(
    patientUuid: string
  ): Promise<ApiResult<OpenMrsPatientVisit[]>> {
    try {
      const { data } = await openMrsHttpClient.get<{
        results: OpenMrsPatientVisit[];
      }>('/visit', { params: { patient: patientUuid, v: 'full' } });
      return success(data.results);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },
};
