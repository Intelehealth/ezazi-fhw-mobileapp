import { describe, expect, it } from 'vitest';

import { decideEndStage1 } from '../decideEndStage1';
import { STAGE1_OUTCOMES } from '../stage1Outcomes';
import { STAGE1_OUTCOME } from '../../constants';

// Expected writes follow Android ReferTypeHelper / VisitCompletionHelper / EncounterDAO
// (whitelabel-master b3ddd15), with REFER_TYPE stored as the English label (decided 2026-10-23).
const NOW = Date.UTC(2026, 9, 23, 10, 30, 0);

describe('STAGE1_OUTCOMES', () => {
  it("lists Android's six choices in dialog order with its English labels", () => {
    expect(STAGE1_OUTCOMES.map((o) => o.androidLabel)).toEqual([
      'Move to Stage 2',
      'Refer to other Hospital',
      'Self discharge against Medical Advice',
      'Shift to C-Section',
      'Refer to high dependency unit / ICU',
      'Mother Death',
    ]);
  });
});

describe('decideEndStage1', () => {
  it("starts Stage 2 with its first card and clears Decision Pending", () => {
    const decision = decideEndStage1(STAGE1_OUTCOME.MOVE_TO_STAGE2, {}, NOW);
    expect(decision.kind).toBe('startStage2');
    if (decision.kind !== 'startStage2') return;
    expect(decision.start.card.name).toBe('Stage2_Hour1_1');
    expect(decision.start.marker).toBe('NORMAL');
    expect(decision.start.decisionPending).toBe('false');
  });

  it('completes the visit two minutes back with the refer type, plus only the details typed', () => {
    expect(decideEndStage1(STAGE1_OUTCOME.REFER_OTHER_HOSPITAL, { hospitalName: 'District Hospital', note: '' }, NOW)).toEqual({
      kind: 'completeVisit',
      visitCompleteTime: '2026-10-23 10:28:00',
      obs: [
        { conceptKey: 'REFER_TYPE', value: 'Refer to other Hospital' },
        { conceptKey: 'REFER_HOSPITAL', value: 'District Hospital' },
      ],
    });
  });

  it('stores only the refer type for the other referral outcomes, ignoring referral details', () => {
    for (const [id, label] of [
      [STAGE1_OUTCOME.SELF_DISCHARGE, 'Self discharge against Medical Advice'],
      [STAGE1_OUTCOME.SHIFT_TO_C_SECTION, 'Shift to C-Section'],
      [STAGE1_OUTCOME.REFER_TO_ICU, 'Refer to high dependency unit / ICU'],
    ] as const) {
      const decision = decideEndStage1(id, { hospitalName: 'ignored' }, NOW);
      expect(decision).toEqual({
        kind: 'completeVisit',
        visitCompleteTime: '2026-10-23 10:28:00',
        obs: [{ conceptKey: 'REFER_TYPE', value: label }],
      });
    }
  });

  it('records a mother death as the YES flag then the reason, and needs a reason', () => {
    expect(decideEndStage1(STAGE1_OUTCOME.MOTHER_DEATH, { reason: '' }, NOW)).toEqual({ kind: 'reasonRequired' });
    expect(decideEndStage1(STAGE1_OUTCOME.MOTHER_DEATH, { reason: 'Haemorrhage' }, NOW)).toEqual({
      kind: 'completeVisit',
      visitCompleteTime: '2026-10-23 10:28:00',
      obs: [
        { conceptKey: 'MOTHER_DECEASED_FLAG', value: 'YES' },
        { conceptKey: 'MOTHER_DECEASED', value: 'Haemorrhage' },
      ],
    });
  });
});
