import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { visitService } from '../../services/visit.service';
import { openMrsHttpClient, portalHttpClient } from '../../services/http';

vi.mock('../../services/http', () => ({
  portalHttpClient: { get: vi.fn() },
  openMrsHttpClient: { get: vi.fn(), post: vi.fn() },
}));

/*
 * env is evaluated once at import, from the developer's untracked .env —
 * mocked so each test decides whether a portal URL is configured.
 */
const env = vi.hoisted(() => ({ PORTAL_URL: 'https://portal.test' }));
vi.mock('../../config/env', () => ({ env }));

/* A real AxiosError, so mapAxiosError classifies it the way it would in the app. */
function httpError(status: number, body: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data: body,
  });
}

const PAGE = { count: 0, totalCount: 0, data: [], success: true as const };

beforeEach(() => {
  vi.mocked(portalHttpClient.get).mockReset();
  vi.mocked(openMrsHttpClient.get).mockReset();
  vi.mocked(openMrsHttpClient.post).mockReset();
  env.PORTAL_URL = 'https://portal.test';
});

describe('when VITE_PORTAL_URL is not set', () => {
  it("fails both calls without sending a request to the web app's own origin", async () => {
    env.PORTAL_URL = '';

    const visits = await visitService.getVisits('priority', {
      page: 1,
      limit: 50,
    });
    const counts = await visitService.getVisitCounts();

    expect(portalHttpClient.get).not.toHaveBeenCalled();
    for (const result of [visits, counts]) {
      expect(!result.ok && result.error.code).toBe('PORTAL_URL_MISSING');
    }
  });
});

describe('visitService.getVisits', () => {
  it.each([
    ['priority', '/openmrs/getPriorityVisits'],
    ['in-progress', '/openmrs/getInProgressVisits'],
    ['completed', '/openmrs/getCompletedVisits'],
  ] as const)(
    'GETs the %s section from %s with the page, limit and facility',
    async (section, path) => {
      vi.mocked(portalHttpClient.get).mockResolvedValue({ data: PAGE });

      const result = await visitService.getVisits(section, {
        page: 2,
        limit: 50,
        facilityUuid: 'fac-1',
      });

      expect(portalHttpClient.get).toHaveBeenCalledWith(path, {
        params: { page: 2, limit: 50, facilityUuid: 'fac-1' },
      });
      expect(result).toEqual({ ok: true, data: PAGE });
    }
  );

  it('leaves facilityUuid out entirely when there is no facility', async () => {
    vi.mocked(portalHttpClient.get).mockResolvedValue({ data: PAGE });

    await visitService.getVisits('completed', { page: 1, limit: 50 });

    expect(portalHttpClient.get).toHaveBeenCalledWith(
      '/openmrs/getCompletedVisits',
      { params: { page: 1, limit: 50 } }
    );
  });

  it("surfaces the portal's error code and message from its error envelope", async () => {
    vi.mocked(portalHttpClient.get).mockRejectedValue(
      httpError(400, {
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input' },
      })
    );

    const result = await visitService.getVisits('priority', {
      page: 0,
      limit: 50,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatchObject({
      kind: 'api',
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
    });
  });

  it('classifies a 5xx as a server error', async () => {
    vi.mocked(portalHttpClient.get).mockRejectedValue(
      httpError(500, {
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      })
    );

    const result = await visitService.getVisits('priority', {
      page: 1,
      limit: 50,
    });

    expect(!result.ok && result.error.kind).toBe('server');
  });

  it('rejects a 200 whose body is not the visit-list envelope (e.g. an HTML page)', async () => {
    vi.mocked(portalHttpClient.get).mockResolvedValue({
      data: '<!doctype html><html></html>',
    });

    const result = await visitService.getVisits('priority', {
      page: 1,
      limit: 50,
    });

    expect(!result.ok && result.error.code).toBe('UNEXPECTED_RESPONSE');
  });
});

describe('visitService.getVisitCounts', () => {
  it('GETs the counts for a speciality and returns just the rows', async () => {
    const rows = [{ Total: 3, Status: 'Visit In Progress' }];
    vi.mocked(portalHttpClient.get).mockResolvedValue({
      data: { data: rows, message: 'Visit count fetched successfully' },
    });

    const result = await visitService.getVisitCounts('General Physician');

    expect(portalHttpClient.get).toHaveBeenCalledWith(
      '/openmrs/getVisitCounts',
      { params: { speciality: 'General Physician' } }
    );
    expect(result).toEqual({ ok: true, data: rows });
  });

  it('sends no speciality param when none is given', async () => {
    vi.mocked(portalHttpClient.get).mockResolvedValue({
      data: { data: [], message: 'ok' },
    });

    await visitService.getVisitCounts();

    expect(portalHttpClient.get).toHaveBeenCalledWith(
      '/openmrs/getVisitCounts',
      { params: {} }
    );
  });

  it('rejects a 200 whose body is not the counts envelope (e.g. an HTML page)', async () => {
    vi.mocked(portalHttpClient.get).mockResolvedValue({
      data: '<!doctype html><html></html>',
    });

    const result = await visitService.getVisitCounts();

    expect(!result.ok && result.error.code).toBe('UNEXPECTED_RESPONSE');
  });

  it('maps a failed request into a failure result instead of throwing', async () => {
    vi.mocked(portalHttpClient.get).mockRejectedValue(new Error('boom'));

    const result = await visitService.getVisitCounts();

    expect(result.ok).toBe(false);
  });
});

describe('visitService.getVisitDetails', () => {
  it("GETs the visit from OpenMRS with VisitService.fetchVisitDetails's representation", async () => {
    const visit = { uuid: 'visit-1', encounters: [] };
    vi.mocked(openMrsHttpClient.get).mockResolvedValue({ data: visit });

    const result = await visitService.getVisitDetails('visit-1');

    expect(openMrsHttpClient.get).toHaveBeenCalledWith('/visit/visit-1', {
      params: {
        v: expect.stringMatching(
          /^custom:\(location:\(display\),uuid,display,startDatetime,stopDatetime,encounters:\(.*obs:\(display,uuid,value,comment,obsDatetime,/
        ),
      },
    });
    expect(result).toEqual({ ok: true, data: visit });
  });

  it('works without a portal address — the visit comes from OpenMRS', async () => {
    env.PORTAL_URL = '';
    vi.mocked(openMrsHttpClient.get).mockResolvedValue({
      data: { uuid: 'visit-1', encounters: [] },
    });

    const result = await visitService.getVisitDetails('visit-1');

    expect(result.ok).toBe(true);
  });

  it('rejects a response that is not a visit', async () => {
    vi.mocked(openMrsHttpClient.get).mockResolvedValue({
      data: '<!doctype html>',
    });

    const result = await visitService.getVisitDetails('visit-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UNEXPECTED_RESPONSE');
  });

  it('maps a failed request into a failure result instead of throwing', async () => {
    vi.mocked(openMrsHttpClient.get).mockRejectedValue(
      httpError(404, {
        error: { message: "Object with given uuid doesn't exist" },
      })
    );

    const result = await visitService.getVisitDetails('missing');

    expect(result.ok).toBe(false);
  });
});

describe('visitService visit attributes', () => {
  const payload = { attributeType: 'type-1', value: 'abc' };

  it('POSTs a new attribute to the visit', async () => {
    vi.mocked(openMrsHttpClient.post).mockResolvedValue({
      data: { uuid: 'attr-1' },
    });

    const result = await visitService.addVisitAttribute('visit-1', payload);

    expect(openMrsHttpClient.post).toHaveBeenCalledWith(
      '/visit/visit-1/attribute',
      payload
    );
    expect(result).toEqual({ ok: true, data: { uuid: 'attr-1' } });
  });

  it('POSTs an update to an existing attribute', async () => {
    vi.mocked(openMrsHttpClient.post).mockResolvedValue({
      data: { uuid: 'attr-1' },
    });

    await visitService.updateVisitAttribute('visit-1', 'attr-1', payload);

    expect(openMrsHttpClient.post).toHaveBeenCalledWith(
      '/visit/visit-1/attribute/attr-1',
      payload
    );
  });

  it('maps a failed write into a failure result instead of throwing', async () => {
    vi.mocked(openMrsHttpClient.post).mockRejectedValue(httpError(500, {}));

    const added = await visitService.addVisitAttribute('visit-1', payload);
    const updated = await visitService.updateVisitAttribute(
      'visit-1',
      'attr-1',
      payload
    );

    expect(added.ok).toBe(false);
    expect(updated.ok).toBe(false);
  });
});
