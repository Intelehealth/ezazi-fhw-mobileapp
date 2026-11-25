import { stage2Choice } from '../EndStageDialogs';

const EMPTY = { stage3: false, motherDeath: false, refer: null, otherComment: '' };

/** End Stage 2's one choice, by Android's precedence (manageBirthOutcomeSelection). */
describe('stage2Choice', () => {
  it('Stage-3 first, then Mother Death, then the comment, then a referral row', () => {
    expect(stage2Choice({ ...EMPTY, stage3: true, motherDeath: true })).toBe('stage3EarlyPostpartum');
    expect(stage2Choice({ ...EMPTY, motherDeath: true, otherComment: 'x' })).toBe('motherDeath');
    expect(stage2Choice({ ...EMPTY, otherComment: 'went home', refer: 'referToIcu' })).toBe('other');
    expect(stage2Choice({ ...EMPTY, refer: 'referToIcu' })).toBe('referToIcu');
  });

  it('nothing chosen (a blank comment does not count): none', () => {
    expect(stage2Choice({ ...EMPTY, otherComment: '   ' })).toBeNull();
  });
});
