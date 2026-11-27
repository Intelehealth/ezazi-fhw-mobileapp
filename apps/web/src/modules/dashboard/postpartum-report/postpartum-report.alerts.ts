import type {
  PostpartumReadingKey,
  PostpartumSection,
} from './postpartum-report.types';

const isNo = (text: string) => text === 'n' || text === 'no';
const isYes = (text: string) => text === 'y' || text === 'yes';

/*
 * Whether a monitoring reading is out of range — ports stage3.component.ts's
 * isAlert(). Temperatures are in °F; BP arrives as "systolic/diastolic".
 */
export function isPostpartumAlert(
  section: PostpartumSection,
  key: PostpartumReadingKey,
  value: string | null
): boolean {
  if (value === null) return false;
  const text = value.trim().toLowerCase();
  if (text === '' || text === '-') return false;
  const num = parseFloat(text);

  switch (key) {
    case 'pulse':
      return !Number.isNaN(num) && (num < 60 || num >= 120);
    case 'bp': {
      const [systolic, diastolic] = text.split('/').map(parseFloat);
      return (
        (!Number.isNaN(systolic) && (systolic < 80 || systolic >= 140)) ||
        (!Number.isNaN(diastolic) && diastolic >= 90)
      );
    }
    case 'temperature':
      if (Number.isNaN(num)) return false;
      return section === 'newborn'
        ? num < 97.7 || num > 99.5
        : num < 95 || num >= 99.5;
    case 'respiratoryRate':
      return !Number.isNaN(num) && num > (section === 'newborn' ? 60 : 30);
    case 'spo2':
      return !Number.isNaN(num) && num < 92;
    case 'bloodLoss':
      return !Number.isNaN(num) && num >= 500;
    case 'uterusContracted':
    case 'urinePassed':
    case 'feetWarm':
    case 'suckingFeeding':
      return isNo(text);
    case 'hematoma':
    case 'grunting':
    case 'chestIndrawing':
    case 'fastBreathing':
    case 'skinColor':
    case 'umbilicalCordOozing':
      return isYes(text);
    case 'complication':
      return !isNo(text) && text !== 'none';
  }
}
