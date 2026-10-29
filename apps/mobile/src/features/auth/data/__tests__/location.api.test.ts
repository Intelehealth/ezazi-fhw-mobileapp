import { createRequestMethods } from '@/core/api/responseHandler';
import { env } from '@/core/config/env';

jest.mock('@/core/api/client', () => ({ apiClient: {} }));
jest.mock('@/core/api/responseHandler', () => ({
  createRequestMethods: jest.fn(() => ({ get: jest.fn(), post: jest.fn() })),
}));

import { locationApi } from '../location.api';

describe('locationApi', () => {

  const http = (createRequestMethods as jest.Mock).mock.results[0].value;

  beforeEach(() => {
    (http.get as jest.Mock).mockClear();
  });

  it('listLoginLocations() GETs OpenMRS /location tagged "Login Location", on the auth-gateway host without its port', () => {
    locationApi.listLoginLocations();

    // OpenMRS REST lives on the same host as the auth-gateway but without its
    // :3030 port — see location.api.ts's header comment.
    const expectedBaseUrl = env.AUTH_GATEWAY_URL.replace(/:\d+$/, '');
    expect(http.get).toHaveBeenCalledWith(
      `${expectedBaseUrl}/openmrs/ws/rest/v1/location`,
      { params: { tag: 'Login Location' } },
    );
  });

});
