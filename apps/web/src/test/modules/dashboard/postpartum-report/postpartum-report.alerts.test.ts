import { describe, expect, it } from 'vitest';
import { isPostpartumAlert } from '../../../../modules/dashboard/postpartum-report/postpartum-report.alerts';

describe('isPostpartumAlert', () => {
  it('flags maternal vitals outside their range', () => {
    expect(isPostpartumAlert('maternal', 'pulse', '124')).toBe(true);
    expect(isPostpartumAlert('maternal', 'pulse', '88')).toBe(false);
    expect(isPostpartumAlert('maternal', 'bp', '96/60')).toBe(false);
    expect(isPostpartumAlert('maternal', 'bp', '142/80')).toBe(true);
    expect(isPostpartumAlert('maternal', 'bp', '120/92')).toBe(true);
    expect(isPostpartumAlert('maternal', 'bloodLoss', '550')).toBe(true);
    expect(isPostpartumAlert('maternal', 'uterusContracted', 'N')).toBe(true);
    expect(isPostpartumAlert('maternal', 'hematoma', 'Y')).toBe(true);
  });

  it('uses each section’s own temperature and respiratory-rate limits', () => {
    expect(isPostpartumAlert('maternal', 'temperature', '97.5')).toBe(false);
    expect(isPostpartumAlert('newborn', 'temperature', '97.5')).toBe(true);
    expect(isPostpartumAlert('maternal', 'respiratoryRate', '40')).toBe(true);
    expect(isPostpartumAlert('newborn', 'respiratoryRate', '40')).toBe(false);
  });

  it('never flags a temperature that is not a number', () => {
    expect(isPostpartumAlert('maternal', 'temperature', 'afebrile')).toBe(
      false
    );
  });

  it('flags newborn danger signs', () => {
    expect(isPostpartumAlert('newborn', 'spo2', '91')).toBe(true);
    expect(isPostpartumAlert('newborn', 'fastBreathing', 'Y')).toBe(true);
    expect(isPostpartumAlert('newborn', 'feetWarm', 'N')).toBe(true);
    expect(isPostpartumAlert('newborn', 'suckingFeeding', 'Y')).toBe(false);
  });

  it('flags any recorded complication but "no"', () => {
    expect(isPostpartumAlert('maternal', 'complication', 'PPH')).toBe(true);
    expect(isPostpartumAlert('maternal', 'complication', 'N')).toBe(false);
    expect(isPostpartumAlert('newborn', 'complication', 'none')).toBe(false);
  });

  it('never flags a missing reading', () => {
    expect(isPostpartumAlert('maternal', 'pulse', null)).toBe(false);
    expect(isPostpartumAlert('maternal', 'pulse', '-')).toBe(false);
  });
});
