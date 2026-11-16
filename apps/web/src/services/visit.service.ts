import {
  ApiError,
  failure,
  mapAxiosError,
  success,
  type ApiResult,
} from '@ezazi/api-client';
import { env } from '../config/env';
import { openMrsHttpClient, portalHttpClient } from './http';
import type { CaseSectionKey } from '../modules/dashboard/dashboard.types';
import type {
  OpenMrsAttribute,
  OpenMrsVisitDetail,
  VisitAttributePayload,
  VisitCountResponse,
  VisitCountRow,
  VisitListParams,
  VisitListResponse,
} from '../types/visit.types';

/** Portal endpoint behind each dashboard section. */
const VISIT_LIST_PATHS: Record<CaseSectionKey, string> = {
  priority: '/openmrs/getPriorityVisits',
  'in-progress': '/openmrs/getInProgressVisits',
  completed: '/openmrs/getCompletedVisits',
};

/*
 * A 200 whose body is not the expected envelope (a proxy's HTML error page,
 * a misconfigured PORTAL_URL pointing at the web server itself, …) would
 * otherwise surface as a TypeError deep inside the row mapper.
 */
function unexpectedResponse(): ApiError {
  return new ApiError('api', 'Unexpected response from the server.', {
    code: 'UNEXPECTED_RESPONSE',
  });
}

/*
 * With no VITE_PORTAL_URL, axios resolves these paths against the web app's
 * own origin (e.g. http://localhost:4200/openmrs/...) and gets index.html
 * back. Fail before sending anything, naming the setting to fix.
 */
function portalNotConfigured(): ApiError {
  return new ApiError(
    'api',
    'The portal server address is not configured. Set VITE_PORTAL_URL and restart the app.',
    { code: 'PORTAL_URL_MISSING' }
  );
}

/** VisitService.fetchVisitDetails's own `v=custom:(...)` representation string. */
const VISIT_DETAIL_REPRESENTATION =
  'custom:(location:(display),uuid,display,startDatetime,stopDatetime,encounters:(display,uuid,encounterDatetime,encounterType:(display),obs:(display,uuid,value,comment,obsDatetime,concept:(uuid,display),creator:(uuid,person:(uuid,display))),encounterProviders:(display,provider:(uuid,attributes,person:(uuid,display,gender,age)))),patient:(uuid,identifiers:(identifier),attributes,person:(display,gender,age,birthdate,attributes)),attributes)';

/**
 * Ports intelehealth-doctor-webapp's VisitService. The dashboard's visit
 * lists (getPriorityVisits / getInProgressVisits / getCompletedVisits and the
 * legacy getVisitCounts) are served by the portal service's `/openmrs/*`
 * routes instead of mindmap's. A single visit and its attributes — the WHO
 * Labour Care Guide screen — come from the OpenMRS REST API itself, as in
 * Angular: the portal has no single-visit route.
 */
export const visitService = {
  /** GET {PORTAL_URL}/openmrs/get{Priority,InProgress,Completed}Visits — one page of a dashboard section. */
  async getVisits(
    section: CaseSectionKey,
    { page, limit, facilityUuid }: VisitListParams
  ): Promise<ApiResult<VisitListResponse>> {
    if (!env.PORTAL_URL) return failure(portalNotConfigured());
    try {
      const { data } = await portalHttpClient.get<VisitListResponse>(
        VISIT_LIST_PATHS[section],
        {
          /* Omitted rather than sent empty — the portal treats both as "no filter". */
          params: { page, limit, ...(facilityUuid ? { facilityUuid } : {}) },
        }
      );
      if (!data || !Array.isArray(data.data)) {
        return failure(unexpectedResponse());
      }
      return success(data);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },

  /**
   * GET {PORTAL_URL}/openmrs/getVisitCounts — active-visit counts per status
   * for a speciality. Not shown on the ELCG dashboard: its "Priority" bucket
   * means a flagged encounter (type 15), not a risk score above 0, so its
   * numbers would contradict the section totals the visit lists report.
   */
  async getVisitCounts(
    speciality?: string
  ): Promise<ApiResult<VisitCountRow[]>> {
    if (!env.PORTAL_URL) return failure(portalNotConfigured());
    try {
      const { data } = await portalHttpClient.get<VisitCountResponse>(
        '/openmrs/getVisitCounts',
        { params: speciality ? { speciality } : {} }
      );
      if (!data || !Array.isArray(data.data)) {
        return failure(unexpectedResponse());
      }
      return success(data.data);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },

  /** GET {OPENMRS_URL}/visit/{uuid}?v=… — VisitService.fetchVisitDetails: the visit with every encounter and obs. */
  async getVisitDetails(
    visitUuid: string
  ): Promise<ApiResult<OpenMrsVisitDetail>> {
    try {
      const { data } = await openMrsHttpClient.get<OpenMrsVisitDetail>(
        `/visit/${visitUuid}`,
        { params: { v: VISIT_DETAIL_REPRESENTATION } }
      );
      if (!data || !Array.isArray(data.encounters)) {
        return failure(unexpectedResponse());
      }
      return success(data);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },

  /** POST {OPENMRS_URL}/visit/{uuid}/attribute — VisitService.postAttribute. */
  async addVisitAttribute(
    visitUuid: string,
    payload: VisitAttributePayload
  ): Promise<ApiResult<OpenMrsAttribute>> {
    try {
      const { data } = await openMrsHttpClient.post<OpenMrsAttribute>(
        `/visit/${visitUuid}/attribute`,
        payload
      );
      return success(data);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },

  /** POST {OPENMRS_URL}/visit/{uuid}/attribute/{attributeUuid} — VisitService.updateAttribute. */
  async updateVisitAttribute(
    visitUuid: string,
    attributeUuid: string,
    payload: VisitAttributePayload
  ): Promise<ApiResult<OpenMrsAttribute>> {
    try {
      const { data } = await openMrsHttpClient.post<OpenMrsAttribute>(
        `/visit/${visitUuid}/attribute/${attributeUuid}`,
        payload
      );
      return success(data);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },
};
