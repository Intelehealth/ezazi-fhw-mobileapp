import { describe, it, expect } from 'vitest';
import { getStageStart } from '../stageStart';
import { STAGE1_CARDS, STAGE2_CARDS } from '../schedule';

const NOW = Date.UTC(2026, 9, 14, 8, 0, 0);

describe('getStageStart', () => {
  it('starts Stage 1 with Stage1_Hour1_1, no marker and no privacy notice (AdmissionWriter)', () => {
    expect(getStageStart('stage1', NOW)).toEqual({
      stage: 'stage1',
      card: STAGE1_CARDS[0],
      encounterTime: '2026-10-14 08:00:00',
      marker: null,
      privacyNoticeValue: null,
      decisionPending: 'false',
    });
  });

  it('starts Stage 2 with Stage2_Hour1_1, the NORMAL marker and privacy notice, clearing Decision Pending', () => {
    expect(getStageStart('stage2', NOW)).toEqual({
      stage: 'stage2',
      card: STAGE2_CARDS[0],
      encounterTime: '2026-10-14 08:00:00',
      marker: 'NORMAL',
      privacyNoticeValue: 'true',
      decisionPending: 'false',
    });
  });

  it('writes the time without milliseconds', () => {
    expect(getStageStart('stage2', NOW + 999).encounterTime).toBe('2026-10-14 08:00:00');
  });

  it('rejects a clock value that is not epoch ms', () => {
    expect(() => getStageStart('stage2', Number.NaN)).toThrow(RangeError);
  });
});
