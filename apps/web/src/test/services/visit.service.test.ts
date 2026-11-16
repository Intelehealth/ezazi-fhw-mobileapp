import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { visitService } from '../../services/visit.service';
import { portalHttpClient } from '../../services/http';

vi.mock('../../services/http', () => ({
  portalHttpClient: { get: vi.fn() },
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

  it('maps a failed request into a failure result instead of throwing', async () => {
    vi.mocked(portalHttpClient.get).mockRejectedValue(new Error('boom'));

    const result = await visitService.getVisitCounts();

    expect(result.ok).toBe(false);
  });
});
