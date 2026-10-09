import { beforeEach, describe, expect, it, vi } from 'vitest';
import { patientService } from '../../services/patient.service';
import { openMrsHttpClient } from '../../services/http';

vi.mock('../../services/http', () => ({
  openMrsHttpClient: { get: vi.fn() },
}));

beforeEach(() => {
  vi.mocked(openMrsHttpClient.get).mockReset();
});

describe('patientService.searchPatients', () => {
  it('GETs /patient with the keyword and the custom representation, returning the results', async () => {
    const results = [
      {
        uuid: 'pat-1',
        identifiers: [
          { identifierType: { name: 'OpenMRS ID' }, identifier: '1000EWA' },
        ],
        person: { display: 'Asha Rai', gender: 'F', age: 28 },
      },
    ];
    vi.mocked(openMrsHttpClient.get).mockResolvedValue({ data: { results } });

    const result = await patientService.searchPatients('Asha');

    expect(openMrsHttpClient.get).toHaveBeenCalledWith('/patient', {
      params: {
        q: 'Asha',
        v: 'custom:(uuid,identifiers:(identifierType:(name),identifier),person)',
      },
    });
    expect(result).toEqual({ ok: true, data: results });
  });

  it('maps a rejected request into a failure result instead of throwing', async () => {
    vi.mocked(openMrsHttpClient.get).mockRejectedValue(
      new Error('network down')
    );

    const result = await patientService.searchPatients('Asha');

    expect(result.ok).toBe(false);
  });
});

describe('patientService.recentVisits', () => {
  it('GETs /visit for the patient with the full representation', async () => {
    vi.mocked(openMrsHttpClient.get).mockResolvedValue({
      data: { results: [{ uuid: 'visit-2' }, { uuid: 'visit-1' }] },
    });

    const result = await patientService.recentVisits('pat-1');

    expect(openMrsHttpClient.get).toHaveBeenCalledWith('/visit', {
      params: { patient: 'pat-1', v: 'full' },
    });
    expect(result).toEqual({
      ok: true,
      data: [{ uuid: 'visit-2' }, { uuid: 'visit-1' }],
    });
  });

  it('maps a rejected request into a failure result instead of throwing', async () => {
    vi.mocked(openMrsHttpClient.get).mockRejectedValue(
      new Error('network down')
    );

    const result = await patientService.recentVisits('pat-1');

    expect(result.ok).toBe(false);
  });
});
