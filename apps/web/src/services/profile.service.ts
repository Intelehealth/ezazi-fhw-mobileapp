import {
  failure,
  mapAxiosError,
  success,
  type ApiResult,
} from '@ezazi/api-client';
import { httpClient, openMrsHttpClient } from './http';
import type {
  OpenMrsLocation,
  OpenMrsProvider,
  OpenMrsSessionResponse,
  PersonNamePayload,
  ProviderAttributeType,
  UpdatePersonPayload,
  UpdateProfileImagePayload,
  ValidateProviderAttributePayload,
  ValidateProviderAttributeResponse,
} from '../types/profile.types';

/** Matches profile.component.ts's own provider `v=custom:(...)` representation string. */
const PROVIDER_REPRESENTATION =
  'custom:(uuid,person:(uuid,display,gender,age,birthdate,preferredName),attributes)';

/**
 * Ports profile.component.ts's ProviderService/ProfileService/AuthService
 * calls (intelehealth-doctor-webapp) against the OpenMRS REST API itself
 * (env.OPENMRS_URL — NOT env.PORTAL_URL, which is EMR-Middleware's own
 * `/portal-api` -> `/api`; a different backend than both that and the
 * auth-gateway httpClient uses). See types/profile.types.ts for the
 * request/response shapes and its own note on the provider-attribute
 * pattern every dynamic field goes through.
 *
 * NOT ported (defined in the Angular source but unused by its own active
 * code paths, per that file's own dead branches): signature
 * generate/upload (createsign/uploadsign, commented out), the standalone
 * getPersonName/getSignture getters.
 */
export const profileService = {
  /**
   * GET {OPENMRS_URL}/session with HTTP Basic auth — AuthService's own
   * `${baseURL}/session` call (session.service.ts), confirmed as the ONLY
   * thing that authenticates OpenMRS REST calls in the reference app: it
   * sets a JSESSIONID cookie the browser then rides for every other
   * openMrsHttpClient call (see that client's own withCredentials note in
   * services/http.ts). Called once, right after a successful gateway login
   * — see hooks/mutations/useLogin.ts — using the same plaintext
   * credentials the user just typed; the auth-gateway's JWT plays no part
   * here, since OpenMRS has no way to verify it.
   */
  async createSession(
    username: string,
    password: string
  ): Promise<ApiResult<OpenMrsSessionResponse>> {
    try {
      const { data } = await openMrsHttpClient.get<OpenMrsSessionResponse>(
        '/session',
        {
          headers: {
            Authorization: `Basic ${btoa(`${username}:${password}`)}`,
          },
        }
      );
      return success(data);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },

  /**
   * DELETE {OPENMRS_URL}/session — ends the OpenMRS session (invalidates the
   * JSESSIONID cookie server-side). Called on logout, and on login when a new
   * session couldn't be established, so a previous user's still-valid cookie
   * can't be silently reused for the next person on a shared machine.
   */
  async endSession(): Promise<ApiResult<void>> {
    try {
      await openMrsHttpClient.delete('/session');
      return success(undefined);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },

  /** GET {OPENMRS_URL}/provider?user={userUuid}&v=... — AuthService.getProvider. */
  async getProvider(userUuid: string): Promise<ApiResult<OpenMrsProvider>> {
    try {
      const { data } = await openMrsHttpClient.get<{
        results: OpenMrsProvider[];
      }>('/provider', {
        params: { user: userUuid, v: PROVIDER_REPRESENTATION },
      });
      const provider = data.results[0];
      if (!provider) {
        throw new Error('No provider record found for this user.');
      }
      return success(provider);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },

  /** GET {OPENMRS_URL}/providerattributetype — ProviderService.getProviderAttributeTypes. */
  async getProviderAttributeTypes(): Promise<
    ApiResult<ProviderAttributeType[]>
  > {
    try {
      const { data } = await openMrsHttpClient.get<{
        results: ProviderAttributeType[];
      }>('/providerattributetype');
      return success(data.results);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },

  /** GET {OPENMRS_URL}/location?tag=Login Location — ProviderService.getLoginLocations (Facility Name dropdown). */
  async getLoginLocations(): Promise<ApiResult<OpenMrsLocation[]>> {
    try {
      const { data } = await openMrsHttpClient.get<{
        results: OpenMrsLocation[];
      }>('/location', { params: { tag: 'Login Location' } });
      return success(data.results);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },

  /** POST {OPENMRS_URL}/person/{personUuid} — ProviderService.updatePerson (gender/age/birthdate). */
  async updatePerson(
    personUuid: string,
    payload: UpdatePersonPayload
  ): Promise<ApiResult<void>> {
    try {
      await openMrsHttpClient.post(`/person/${personUuid}`, payload);
      return success(undefined);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },

  /**
   * POST {OPENMRS_URL}/person/{personUuid}/name[/{nameUuid}] — creates the
   * preferred name when `nameUuid` is omitted, updates the existing one
   * otherwise (ProviderService.createPersonName/updatePersonName).
   */
  async savePersonName(
    personUuid: string,
    payload: PersonNamePayload,
    nameUuid?: string
  ): Promise<ApiResult<void>> {
    try {
      const path = nameUuid
        ? `/person/${personUuid}/name/${nameUuid}`
        : `/person/${personUuid}/name`;
      await openMrsHttpClient.post(path, payload);
      return success(undefined);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },

  /**
   * POST {OPENMRS_URL}/provider/{providerUuid}/attribute[/{attributeUuid}] —
   * ProviderService.addOrUpdateProviderAttribute. Every dynamic profile
   * field (email, phone, qualification, signature, …) is one of these
   * OpenMRS "provider attribute" values, not its own column.
   *
   * A falsy `value` never POSTs an empty string — OpenMRS can reject one
   * outright, and every attribute call runs in the same Promise.all as the
   * rest of the save (see useUpdateProviderProfile.ts), so one rejected
   * empty field would fail the whole profile update. Instead a blank value
   * clears an attribute that already exists (DELETE, which OpenMRS voids),
   * so emptying an optional field like State actually sticks, and does
   * nothing at all when there is no existing attribute to clear.
   */
  async addOrUpdateProviderAttribute(
    providerUuid: string,
    attributeTypeUuid: string,
    value: string,
    existingAttributeUuid?: string
  ): Promise<ApiResult<void>> {
    if (!value && !existingAttributeUuid) return success(undefined);

    try {
      if (!value) {
        await openMrsHttpClient.delete(
          `/provider/${providerUuid}/attribute/${existingAttributeUuid}`
        );
        return success(undefined);
      }

      const path = existingAttributeUuid
        ? `/provider/${providerUuid}/attribute/${existingAttributeUuid}`
        : `/provider/${providerUuid}/attribute`;
      const body = existingAttributeUuid
        ? { value }
        : { attributeType: attributeTypeUuid, value };
      await openMrsHttpClient.post(path, body);
      return success(undefined);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },

  /** POST {OPENMRS_URL}/personimage — ProfileService.updateProfileImage (base64, no data-uri prefix). */
  async updateProfileImage(
    payload: UpdateProfileImagePayload
  ): Promise<ApiResult<void>> {
    try {
      await openMrsHttpClient.post('/personimage', payload);
      return success(undefined);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },

  /**
   * POST {AUTH_GATEWAY_URL}/auth/validateProviderAttribute —
   * AuthService.validateProviderAttribute, the email/phone "already exists"
   * check, served by auth-gateway (not OpenMRS, and no longer the legacy
   * mindmap service).
   */
  async validateProviderAttribute(
    payload: ValidateProviderAttributePayload
  ): Promise<ApiResult<ValidateProviderAttributeResponse>> {
    try {
      const { data } =
        await httpClient.post<ValidateProviderAttributeResponse>(
          '/auth/validateProviderAttribute',
          payload
        );
      return success(data);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },
};
