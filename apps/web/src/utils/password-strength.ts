export type PasswordStrengthLevel = 1 | 2 | 3 | 4;

export function hasLowerCase(value: string): boolean {
  return /[a-z]/.test(value);
}

export function hasUpperCase(value: string): boolean {
  return /[A-Z]/.test(value);
}

export function hasNumber(value: string): boolean {
  return /[0-9]/.test(value);
}

export function hasSpecialCharacter(value: string): boolean {
  return /[^A-Za-z0-9]/.test(value);
}

const STRONG_PASSWORD = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.{12,})/;
const MEDIUM_PASSWORD = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.{8,})/;
const FAIR_PASSWORD = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})/;

/**
 * Ported verbatim from setup-new-password.component.ts's checkPasswordStrength
 * (already a clean, correct 1–4 scale — no approximation needed): strong
 * (12+ chars, all 4 classes) = 4, medium (8+, all 4 classes) = 3, fair
 * (8+, upper+lower+number only) = 2, else = 1.
 */
export function checkPasswordStrength(value: string): PasswordStrengthLevel {
  if (STRONG_PASSWORD.test(value)) return 4;
  if (MEDIUM_PASSWORD.test(value)) return 3;
  if (FAIR_PASSWORD.test(value)) return 2;
  return 1;
}
