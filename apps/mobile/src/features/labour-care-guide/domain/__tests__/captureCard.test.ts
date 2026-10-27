import { toCaptureHeader, toCaptureLayout, type CaptureCardRow } from '../captureCard';

const CARD: CaptureCardRow = {
  encounterUuid: 'card-1',
  cardName: 'Stage1_Hour2_1',
  isSos: false,
  sosLabel: null,
  encounterTime: '2026-10-27 04:00:00',
};

/** The capture title's stage and time, for normal and SOS cards. */
describe('toCaptureHeader', () => {
  it('names a timer card by its stage, at its card time', () => {
    expect(toCaptureHeader(CARD)).toEqual({ isSos: false, stage: 'stage1', scheduledAt: '2026-10-27T04:00:00.000Z' });
  });

  it("shows an SOS card from Android's Stage 3 as the UI's Stage 4", () => {
    const sos = { ...CARD, cardName: null, isSos: true, sosLabel: 'Stage3_Hour2_SOS1' };

    expect(toCaptureHeader(sos)?.stage).toBe('earlyPostpartum');
  });

  it('takes an SOS card\'s stage from its label, and Stage 1 when the label is missing (Android)', () => {
    const sos = { ...CARD, cardName: null, isSos: true };

    expect(toCaptureHeader({ ...sos, sosLabel: 'Stage2_Hour1_SOS2' })).toMatchObject({ isSos: true, stage: 'stage2' });
    expect(toCaptureHeader({ ...sos, sosLabel: null })?.stage).toBe('stage1');
  });

  it('gives no header for an unknown card or an unreadable time', () => {
    expect(toCaptureHeader({ ...CARD, cardName: 'EMERGENCY' })).toBeNull();
    expect(toCaptureHeader({ ...CARD, encounterTime: '' })).toBeNull();
  });
});

describe('toCaptureLayout', () => {
  it('gives a regular card the fields Android shows on it', () => {
    expect(toCaptureLayout(CARD)?.sections.map((section) => section.section.id)).toContain('baby');
  });

  it('gives an SOS card every field of its stage', () => {
    const sos = toCaptureLayout({ ...CARD, cardName: null, isSos: true, sosLabel: 'Stage2_Hour1_SOS1' });
    expect(sos?.stage).toBe('stage2');
    expect(sos?.sections).toHaveLength(6);
  });

  it('gives no layout for a Stage 3 SOS or an unknown card (not in the package yet)', () => {
    expect(toCaptureLayout({ ...CARD, cardName: null, isSos: true, sosLabel: 'Stage3_Hour2_SOS1' })).toBeNull();
    expect(toCaptureLayout({ ...CARD, cardName: 'EMERGENCY' })).toBeNull();
  });
});
