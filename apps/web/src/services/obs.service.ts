import {
  failure,
  mapAxiosError,
  success,
  type ApiResult,
} from '@ezazi/api-client';
import { openMrsHttpClient } from './http';

/** POST {OPENMRS_URL}/obs — a new observation on an existing encounter. */
export interface CreateObsPayload {
  concept: string;
  /** The patient's person uuid. */
  person: string;
  obsDatetime: string;
  value: string;
  encounter: string;
}

/** The parts of the saved obs the callers read back. */
export interface SavedObs {
  uuid: string;
  value: unknown;
  obsDatetime: string;
}

/**
 * Ports EncounterService's postObs / updateObs / deleteObs
 * (intelehealth-doctor-webapp) — the OpenMRS REST calls behind the Shared
 * Decision Making dialogs.
 */
export const obsService = {
  /** POST {OPENMRS_URL}/obs */
  async createObs(payload: CreateObsPayload): Promise<ApiResult<SavedObs>> {
    try {
      const { data } = await openMrsHttpClient.post<SavedObs>('/obs', payload);
      return success(data);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },

  /** POST {OPENMRS_URL}/obs/{uuid} — OpenMRS updates with a POST. */
  async updateObs(
    obsUuid: string,
    payload: { value: string }
  ): Promise<ApiResult<SavedObs>> {
    try {
      const { data } = await openMrsHttpClient.post<SavedObs>(
        `/obs/${obsUuid}`,
        payload
      );
      return success(data);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },

  /** DELETE {OPENMRS_URL}/obs/{uuid} — voids the obs. */
  async deleteObs(obsUuid: string): Promise<ApiResult<null>> {
    try {
      await openMrsHttpClient.delete(`/obs/${obsUuid}`);
      return success(null);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },
};
