import { describe, expect, it } from 'vitest';

import { decideEndStage2 } from '../decideEndStage2';
import { STAGE2_OUTCOMES } from '../stage2Outcomes';
import { summarizeVisitOutcome } from '../visitOutcome';
import { STAGE2_OUTCOME } from '../../constants';

// Expected writes follow Android CompleteVisitOnEnd2StageDialog / ReferTypeHelper / VisitCompletionHelper
// (whitelabel-master 9105fc5), REFER_TYPE in English as End Stage 1 (decided 2026-10-23, 2026-11-06).
const NOW = Date.UTC(2026, 10, 6, 10, 30, 0);

describe('STAGE2_OUTCOMES', () => {
  it("lists Android's choices in dialog order, without its stray second Self discharge row", () => {
    expect(STAGE2_OUTCOMES.map((o) => [o.kind, o.androidLabel])).toEqual([
      ['checkbox', 'Stage-3 & Early Postpartum'],
      ['row', 'Refer to other Hospital'],
      ['row', 'Self discharge against Medical Advice'],
      ['row', 'Shift to C-Section'],
      ['row', 'Refer to high dependency unit / ICU'],
      ['checkbox', 'Mother Death'],
      ['text', 'Other'],
    ]);
  });
});

describe('decideEndStage2', () => {
  it('Stage-3 & Early Postpartum goes on to the delivery form and writes nothing here', () => {
    expect(decideEndStage2(STAGE2_OUTCOME.STAGE3_EARLY_POSTPARTUM, {}, NOW)).toEqual({ kind: 'openDeliveryForm' });
  });

  it('a referral completes the visit two minutes back, exactly as End Stage 1', () => {
    expect(decideEndStage2(STAGE2_OUTCOME.REFER_OTHER_HOSPITAL, { hospitalName: 'District Hospital', doctorName: '' }, NOW)).toEqual({
      kind: 'completeVisit',
      visitCompleteTime: '2026-11-06 10:28:00',
      obs: [
        { conceptKey: 'REFER_TYPE', value: 'Refer to other Hospital' },
        { conceptKey: 'REFER_HOSPITAL', value: 'District Hospital' },
      ],
    });
    expect(decideEndStage2(STAGE2_OUTCOME.SHIFT_TO_C_SECTION, { hospitalName: 'ignored' }, NOW)).toMatchObject({
      obs: [{ conceptKey: 'REFER_TYPE', value: 'Shift to C-Section' }],
    });
  });

  it('Mother Death needs a reason, then writes the flag and the reason', () => {
    expect(decideEndStage2(STAGE2_OUTCOME.MOTHER_DEATH, {}, NOW)).toEqual({ kind: 'reasonRequired' });
    expect(decideEndStage2(STAGE2_OUTCOME.MOTHER_DEATH, { reason: 'PPH' }, NOW)).toMatchObject({
      kind: 'completeVisit',
      obs: [
        { conceptKey: 'MOTHER_DECEASED_FLAG', value: 'YES' },
        { conceptKey: 'MOTHER_DECEASED', value: 'PPH' },
      ],
    });
  });

  it('Other needs a comment, then writes REFER_TYPE "Other" and the comment', () => {
    expect(decideEndStage2(STAGE2_OUTCOME.OTHER, { otherComment: '   ' }, NOW)).toEqual({ kind: 'otherCommentRequired' });
    expect(decideEndStage2(STAGE2_OUTCOME.OTHER, { otherComment: 'Family took her home' }, NOW)).toMatchObject({
      kind: 'completeVisit',
      obs: [
        { conceptKey: 'REFER_TYPE', value: 'Other' },
        { conceptKey: 'END_2ND_STAGE_OTHER', value: 'Family took her home' },
      ],
    });
  });
});

describe('summarizeVisitOutcome (Android ObsDAO.findOutcome)', () => {
  it('names a referral by its stored REFER_TYPE', () => {
    expect(summarizeVisitOutcome({ REFER_TYPE: 'Shift to C-Section' })).toEqual({
      outcome: 'Shift to C-Section',
      hasMotherDeceased: false,
      motherDeceasedReason: null,
      otherComment: null,
    });
  });

  it('Other carries its comment', () => {
    expect(summarizeVisitOutcome({ REFER_TYPE: 'Other', END_2ND_STAGE_OTHER: 'Family took her home' })).toMatchObject({
      outcome: 'Other',
      otherComment: 'Family took her home',
    });
  });

  it('Mother Death carries its reason', () => {
    expect(summarizeVisitOutcome({ MOTHER_DECEASED_FLAG: 'YES', MOTHER_DECEASED: 'PPH' })).toEqual({
      outcome: 'Mother Death',
      hasMotherDeceased: true,
      motherDeceasedReason: 'PPH',
      otherComment: null,
    });
  });

  it('nothing stored: no outcome', () => {
    expect(summarizeVisitOutcome({}).outcome).toBe('');
  });
});
