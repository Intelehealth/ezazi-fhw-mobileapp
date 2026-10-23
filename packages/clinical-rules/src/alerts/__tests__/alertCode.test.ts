import { describe, expect, it } from 'vitest';

import { getAlertCode } from '../alertCode';
import { FIELD_ID, type FieldId } from '../../constants';
import { STAGE1_AND_2_FIELDS } from '../../fields/stage1And2Fields';

// A literal port of Android PartogramAlertEngine.getAlertNameUpdated (whitelabel-master b3ddd15,
// lines 199-406), kept independent of the package. It matches on section and parameter NAMES,
// exactly as Android does, which is how its "Amniotic fluid meconium" name never matches.
function androidAlert(section: string, name: string, value: string | null): string {
  if (value === null || value === '') return '';
  const eq = (a: string, b: string) => a.length === b.length && a.toUpperCase() === b.toUpperCase();
  const is = (...codes: string[]) => codes.some((code) => eq(value, code));
  const int = () => {
    if (!/^[+-]?\d+$/.test(value)) throw new Error('NumberFormatException');
    return Number(value);
  };
  let alert = 'G';
  if (eq(section, 'Supportive care')) {
    if (eq(name, 'Companion') || eq(name, 'Pain relief') || eq(name, 'Oral fluid')) {
      if (is('Y', 'D')) alert = 'G';
      else if (is('N')) alert = 'R';
    } else if (eq(name, 'Posture')) {
      if (is('MO')) alert = 'G';
      else if (is('SP')) alert = 'R';
    }
  } else if (eq(section, 'BABY')) {
    if (eq(name, 'Baseline FHR')) {
      const val = int();
      alert = val >= 160 || val < 110 ? 'R' : 'G';
    } else if (eq(name, 'FHR deceleration')) {
      if (is('N', 'E', 'V')) alert = 'G';
      else if (is('L')) alert = 'R';
    } else if (eq(name, 'Amniotic fluid meconium')) {
      if (is('I', 'C', 'M+', 'M++')) alert = 'G';
      else if (is('M+++', 'B')) alert = 'R';
    } else if (eq(name, 'Fetal position')) {
      if (is('A')) alert = 'G';
      else if (is('P', 'T')) alert = 'R';
    } else if (eq(name, 'Caput') || eq(name, 'Moulding')) {
      if (is('N', '+', '++')) alert = 'G';
      else if (is('+++')) alert = 'R';
    }
  } else if (eq(section, 'Woman')) {
    if (eq(name, 'Pulse')) {
      const val = int();
      alert = val < 60 || val >= 120 ? 'R' : 'G';
    } else if (eq(name, 'Systolic BP')) {
      const val = int();
      alert = val < 80 || val >= 140 ? 'R' : 'G';
    } else if (eq(name, 'Diastolic BP')) {
      alert = int() >= 90 ? 'R' : 'G';
    } else if (eq(name, 'Temperature (°F)')) {
      const val = Number(value);
      if (val < 95 || val >= 99.5) alert = 'R';
    } else if (eq(name, 'Urine protein')) {
      alert = is('P2+', 'P3+', 'P4+') ? 'R' : 'G';
    } else if (eq(name, 'Urine Acetone')) {
      alert = is('A2+', 'A3+', 'A4+') ? 'R' : 'G';
    }
  } else if (eq(section, 'Labour Progress')) {
    if (eq(name, 'Contractions per 10 min')) {
      const val = int();
      alert = val <= 2 || val > 5 ? 'R' : 'G';
    } else if (eq(name, 'Duration of contractions')) {
      const val = int();
      alert = val > 60 || val < 20 ? 'R' : 'G';
    }
  }
  return alert;
}

// Android's section and parameter names per field (PartogramConstants), literal.
const ANDROID_NAMES: Record<FieldId, [string, string]> = {
  companion: ['Supportive care', 'Companion'],
  painRelief: ['Supportive care', 'Pain relief'],
  oralFluid: ['Supportive care', 'Oral Fluid'],
  posture: ['Supportive care', 'Posture'],
  baselineFhr: ['Baby', 'Baseline FHR'],
  fhrDeceleration: ['Baby', 'FHR Deceleration'],
  amnioticFluid: ['Baby', 'Amniotic Fluid'],
  fetalPosition: ['Baby', 'Fetal Position'],
  caput: ['Baby', 'Caput'],
  moulding: ['Baby', 'Moulding'],
  pulse: ['Woman', 'Pulse'],
  systolicBp: ['Woman', 'Systolic BP'],
  diastolicBp: ['Woman', 'Diastolic BP'],
  temperature: ['Woman', 'Temperature (°F)'],
  urineProtein: ['Woman', 'Urine protein'],
  urineAcetone: ['Woman', 'Urine Acetone'],
  contractionsPer10Min: ['Labour Progress', 'Contractions per 10 min'],
  contractionDuration: ['Labour Progress', 'Duration of contractions'],
  cervix: ['Labour Progress', 'Cervix Plot[X]'],
  descent: ['Labour Progress', 'Descent Plot[O]'],
  oxytocin: ['Medication', 'Oxytocin (U/L, drops/min)'],
  medicine: ['Medication', 'Medicine'],
  ivFluids: ['Medication', 'IV Fluids'],
  assessment: ['Shared Decision Making', 'Assessment'],
  plan: ['Shared Decision Making', 'Plan'],
  supervisorDoctor: ['Shared Decision Making', 'Supervisor Doctor'],
};

const android = (id: FieldId, value: string | null) => androidAlert(...ANDROID_NAMES[id], value);
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

describe('getAlertCode', () => {
  it('matches Android for every option of every select field, except the amniotic-fluid fix', () => {
    for (const field of STAGE1_AND_2_FIELDS) {
      if (field.input.kind !== 'select' || field.id === FIELD_ID.AMNIOTIC_FLUID) continue;
      for (const { value } of field.input.options) {
        expect([field.id, value, getAlertCode(field.id, value)]).toEqual([field.id, value, android(field.id, value)]);
      }
    }
  });

  it('matches Android across every whole number around each threshold', () => {
    const sweeps: [FieldId, string[]][] = [
      [FIELD_ID.BASELINE_FHR, range(50, 250)],
      [FIELD_ID.PULSE, range(20, 260)],
      [FIELD_ID.SYSTOLIC_BP, range(20, 310)],
      [FIELD_ID.DIASTOLIC_BP, range(10, 190)],
      [FIELD_ID.CONTRACTIONS_PER_10MIN, range(0, 10)],
      [FIELD_ID.CONTRACTION_DURATION, range(0, 100)],
    ];
    for (const [id, values] of sweeps) {
      for (const value of values) expect([id, value, getAlertCode(id, value)]).toEqual([id, value, android(id, value)]);
    }
  });

  it('matches Android for temperature at every tenth of a degree', () => {
    for (let tenths = 896; tenths <= 1090; tenths += 1) {
      const value = (tenths / 10).toFixed(1);
      expect([value, getAlertCode(FIELD_ID.TEMPERATURE, value)]).toEqual([value, android(FIELD_ID.TEMPERATURE, value)]);
    }
    expect(getAlertCode(FIELD_ID.TEMPERATURE, '95')).toBe('G');
    expect(getAlertCode(FIELD_ID.TEMPERATURE, '99.5')).toBe('R');
  });

  it('gives no code for an empty value, as Android', () => {
    expect(getAlertCode(FIELD_ID.BASELINE_FHR, '')).toBe('');
    expect(getAlertCode(FIELD_ID.POSTURE, null)).toBe('');
    expect(getAlertCode(FIELD_ID.POSTURE, undefined)).toBe('');
  });

  it('matches options ignoring case, as Java equalsIgnoreCase', () => {
    expect(getAlertCode(FIELD_ID.POSTURE, 'sp')).toBe(android(FIELD_ID.POSTURE, 'sp'));
    expect(getAlertCode(FIELD_ID.COMPANION, 'n')).toBe('R');
    expect(getAlertCode(FIELD_ID.URINE_PROTEIN, 'p2+')).toBe('R');
  });

  it('gives G to fields Android never codes red, matching its default', () => {
    for (const id of [FIELD_ID.CERVIX, FIELD_ID.DESCENT, FIELD_ID.SUPERVISOR_DOCTOR, FIELD_ID.OXYTOCIN] as const) {
      expect(getAlertCode(id, '7')).toBe(android(id, '7'));
    }
  });

  describe('deviations (README)', () => {
    it('codes thick meconium and blood-stained fluid red; Android never matches the field name', () => {
      expect(android(FIELD_ID.AMNIOTIC_FLUID, 'M+++')).toBe('G');
      expect(getAlertCode(FIELD_ID.AMNIOTIC_FLUID, 'M+++')).toBe('R');
      expect(getAlertCode(FIELD_ID.AMNIOTIC_FLUID, 'B')).toBe('R');
      for (const value of ['I', 'C', 'M+', 'M++']) expect(getAlertCode(FIELD_ID.AMNIOTIC_FLUID, value)).toBe('G');
    });

    it('codes a value that is not a number G; Android throws NumberFormatException', () => {
      expect(() => android(FIELD_ID.BASELINE_FHR, 'abc')).toThrow();
      expect(getAlertCode(FIELD_ID.BASELINE_FHR, 'abc')).toBe('G');
      expect(getAlertCode(FIELD_ID.PULSE, '72.5')).toBe('G');
    });
  });
});
