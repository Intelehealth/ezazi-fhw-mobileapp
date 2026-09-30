import { beforeEach, describe, expect, it, vi } from 'vitest';
import { profileService } from '../../services/profile.service';
import { mindmapHttpClient, openMrsHttpClient } from '../../services/http';
import type { OpenMrsProvider } from '../../types/profile.types';

vi.mock('../../services/http', () => ({
  openMrsHttpClient: { get: vi.fn(), post: vi.fn() },
  mindmapHttpClient: { post: vi.fn() },
}));

beforeEach(() => {
  vi.mocked(openMrsHttpClient.get).mockClear();
  vi.mocked(openMrsHttpClient.post).mockClear();
  vi.mocked(mindmapHttpClient.post).mockClear();
});

const PROVIDER: OpenMrsProvider = {
  uuid: 'p-1',
  person: {
    uuid: 'per-1',
    display: 'Demo Male Doctor',
    gender: 'M',
    age: 38,
    birthdate: '1988-04-12',
    preferredName: {
      uuid: 'name-1',
      givenName: 'Demo',
      middleName: '',
      familyName: 'Doctor',
    },
  },
  attributes: [
    {
      uuid: 'attr-1',
      attributeType: { uuid: 'type-emailId', display: 'emailId' },
      value: 'demo@example.com',
      voided: false,
    },
  ],
};

describe('profileService.createSession', () => {
  it('GETs /session with a Basic-auth header built from the plaintext credentials', async () => {
    vi.mocked(openMrsHttpClient.get).mockResolvedValue({
      data: { sessionId: 'sess-1', authenticated: true },
    });

    const result = await profileService.createSession('doctor1', 'Doctor@123');

    expect(openMrsHttpClient.get).toHaveBeenCalledWith('/session', {
      headers: { Authorization: `Basic ${btoa('doctor1:Doctor@123')}` },
    });
    expect(result).toEqual({
      ok: true,
      data: { sessionId: 'sess-1', authenticated: true },
    });
  });

  it('maps a rejected request into a failure result instead of throwing', async () => {
    vi.mocked(openMrsHttpClient.get).mockRejectedValue(
      new Error('network down')
    );

    const result = await profileService.createSession('doctor1', 'wrong');

    expect(result.ok).toBe(false);
  });
});

describe('profileService.getProvider', () => {
  it('GETs /provider with the user uuid and representation, returning the first result', async () => {
    vi.mocked(openMrsHttpClient.get).mockResolvedValue({
      data: { results: [PROVIDER] },
    });

    const result = await profileService.getProvider('u-1');

    expect(openMrsHttpClient.get).toHaveBeenCalledWith('/provider', {
      params: { user: 'u-1', v: expect.stringContaining('attributes') },
    });
    expect(result).toEqual({ ok: true, data: PROVIDER });
  });

  it('fails when no provider record is returned', async () => {
    vi.mocked(openMrsHttpClient.get).mockResolvedValue({
      data: { results: [] },
    });

    const result = await profileService.getProvider('u-1');

    expect(result.ok).toBe(false);
  });

  it('maps a rejected request into a failure result instead of throwing', async () => {
    vi.mocked(openMrsHttpClient.get).mockRejectedValue(
      new Error('network down')
    );

    const result = await profileService.getProvider('u-1');

    expect(result.ok).toBe(false);
  });
});

describe('profileService.getProviderAttributeTypes', () => {
  it('GETs /providerattributetype and returns the results array', async () => {
    const types = [{ uuid: 'type-emailId', display: 'emailId' }];
    vi.mocked(openMrsHttpClient.get).mockResolvedValue({
      data: { results: types },
    });

    const result = await profileService.getProviderAttributeTypes();

    expect(openMrsHttpClient.get).toHaveBeenCalledWith(
      '/providerattributetype'
    );
    expect(result).toEqual({ ok: true, data: types });
  });

  it('maps a rejected request into a failure result instead of throwing', async () => {
    vi.mocked(openMrsHttpClient.get).mockRejectedValue(
      new Error('network down')
    );

    const result = await profileService.getProviderAttributeTypes();

    expect(result.ok).toBe(false);
  });
});

describe('profileService.getLoginLocations', () => {
  it('GETs /location filtered to the Login Location tag', async () => {
    const locations = [
      { uuid: 'loc-1', display: 'Ason Primary Health Care Centre' },
    ];
    vi.mocked(openMrsHttpClient.get).mockResolvedValue({
      data: { results: locations },
    });

    const result = await profileService.getLoginLocations();

    expect(openMrsHttpClient.get).toHaveBeenCalledWith('/location', {
      params: { tag: 'Login Location' },
    });
    expect(result).toEqual({ ok: true, data: locations });
  });

  it('maps a rejected request into a failure result instead of throwing', async () => {
    vi.mocked(openMrsHttpClient.get).mockRejectedValue(
      new Error('network down')
    );

    const result = await profileService.getLoginLocations();

    expect(result.ok).toBe(false);
  });
});

describe('profileService.updatePerson', () => {
  it('POSTs gender/age/birthdate to /person/:personUuid', async () => {
    vi.mocked(openMrsHttpClient.post).mockResolvedValue({ data: {} });
    const payload = { gender: 'F', age: 38, birthdate: '1988-04-12' };

    const result = await profileService.updatePerson('per-1', payload);

    expect(openMrsHttpClient.post).toHaveBeenCalledWith(
      '/person/per-1',
      payload
    );
    expect(result.ok).toBe(true);
  });

  it('maps a rejected request into a failure result instead of throwing', async () => {
    vi.mocked(openMrsHttpClient.post).mockRejectedValue(
      new Error('network down')
    );

    const result = await profileService.updatePerson('per-1', {
      gender: 'F',
      age: 38,
      birthdate: '1988-04-12',
    });

    expect(result.ok).toBe(false);
  });
});

describe('profileService.savePersonName', () => {
  const payload = {
    givenName: 'Demo',
    middleName: 'K',
    familyName: 'Doctor',
    preferred: true as const,
    prefix: null,
  };

  it('POSTs to /person/:personUuid/name to create a name when no nameUuid is given', async () => {
    vi.mocked(openMrsHttpClient.post).mockResolvedValue({ data: {} });

    await profileService.savePersonName('per-1', payload);

    expect(openMrsHttpClient.post).toHaveBeenCalledWith(
      '/person/per-1/name',
      payload
    );
  });

  it('POSTs to /person/:personUuid/name/:nameUuid to update an existing name', async () => {
    vi.mocked(openMrsHttpClient.post).mockResolvedValue({ data: {} });

    await profileService.savePersonName('per-1', payload, 'name-1');

    expect(openMrsHttpClient.post).toHaveBeenCalledWith(
      '/person/per-1/name/name-1',
      payload
    );
  });

  it('maps a rejected request into a failure result instead of throwing', async () => {
    vi.mocked(openMrsHttpClient.post).mockRejectedValue(
      new Error('network down')
    );

    const result = await profileService.savePersonName('per-1', payload);

    expect(result.ok).toBe(false);
  });
});

describe('profileService.addOrUpdateProviderAttribute', () => {
  it('POSTs {attributeType, value} to the collection when no existing attribute uuid is given', async () => {
    vi.mocked(openMrsHttpClient.post).mockResolvedValue({ data: {} });

    await profileService.addOrUpdateProviderAttribute(
      'p-1',
      'type-emailId',
      'demo@example.com'
    );

    expect(openMrsHttpClient.post).toHaveBeenCalledWith(
      '/provider/p-1/attribute',
      { attributeType: 'type-emailId', value: 'demo@example.com' }
    );
  });

  it('POSTs just {value} to the existing attribute sub-resource when an attribute uuid is given', async () => {
    vi.mocked(openMrsHttpClient.post).mockResolvedValue({ data: {} });

    await profileService.addOrUpdateProviderAttribute(
      'p-1',
      'type-emailId',
      'new@example.com',
      'attr-1'
    );

    expect(openMrsHttpClient.post).toHaveBeenCalledWith(
      '/provider/p-1/attribute/attr-1',
      { value: 'new@example.com' }
    );
  });

  it('skips the request entirely for a falsy value, matching the Angular source', async () => {
    const result = await profileService.addOrUpdateProviderAttribute(
      'p-1',
      'type-otherQualification',
      ''
    );

    expect(openMrsHttpClient.post).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, data: undefined });
  });

  it('maps a rejected request into a failure result instead of throwing', async () => {
    vi.mocked(openMrsHttpClient.post).mockRejectedValue(
      new Error('network down')
    );

    const result = await profileService.addOrUpdateProviderAttribute(
      'p-1',
      'type-emailId',
      'demo@example.com'
    );

    expect(result.ok).toBe(false);
  });
});

describe('profileService.updateProfileImage', () => {
  it('POSTs the person uuid and base64 image to /personimage', async () => {
    vi.mocked(openMrsHttpClient.post).mockResolvedValue({ data: {} });
    const payload = { person: 'per-1', base64EncodedImage: 'abc123' };

    const result = await profileService.updateProfileImage(payload);

    expect(openMrsHttpClient.post).toHaveBeenCalledWith(
      '/personimage',
      payload
    );
    expect(result.ok).toBe(true);
  });

  it('maps a rejected request into a failure result instead of throwing', async () => {
    vi.mocked(openMrsHttpClient.post).mockRejectedValue(
      new Error('network down')
    );

    const result = await profileService.updateProfileImage({
      person: 'per-1',
      base64EncodedImage: 'abc123',
    });

    expect(result.ok).toBe(false);
  });
});

describe('profileService.validateProviderAttribute', () => {
  it('POSTs to the mindmap client (not openMrsHttpClient) and returns the availability flag', async () => {
    vi.mocked(mindmapHttpClient.post).mockResolvedValue({
      data: { success: true, data: true },
    });
    const payload = {
      attributeType: 'emailId' as const,
      attributeValue: 'demo@example.com',
      providerUuid: 'p-1',
    };

    const result = await profileService.validateProviderAttribute(payload);

    expect(mindmapHttpClient.post).toHaveBeenCalledWith(
      '/auth/validateProviderAttribute',
      payload
    );
    expect(openMrsHttpClient.post).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, data: { success: true, data: true } });
  });

  it('maps a rejected request into a failure result instead of throwing', async () => {
    vi.mocked(mindmapHttpClient.post).mockRejectedValue(
      new Error('network down')
    );

    const result = await profileService.validateProviderAttribute({
      attributeType: 'phoneNumber',
      attributeValue: '9800000000',
      providerUuid: 'p-1',
    });

    expect(result.ok).toBe(false);
  });
});
