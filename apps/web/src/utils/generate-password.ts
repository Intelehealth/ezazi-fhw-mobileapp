import {
  hasLowerCase,
  hasNumber,
  hasSpecialCharacter,
  hasUpperCase,
} from './password-strength';

const PASSWORD_CHARS =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789*@$&';
const GENERATED_PASSWORD_LENGTH = 8;

/**
 * Ported from setup-new-password.component.ts's generatePassword() — same
 * charset, same do/while-until-all-4-classes-satisfied loop, same 8-char
 * length. Deliberate one-line fix versus the Angular source: it indexes with
 * `Math.floor(Math.random() * chars.length + 1)`, which can land one past
 * the last character — `String.charAt` on an out-of-range index silently
 * returns '', quietly shrinking the generated password below 8 characters.
 * Fixed here to `Math.floor(Math.random() * chars.length)`.
 */
export function generatePassword(): string {
  let password = '';
  do {
    password = '';
    for (let i = 0; i < GENERATED_PASSWORD_LENGTH; i++) {
      const index = Math.floor(Math.random() * PASSWORD_CHARS.length);
      password += PASSWORD_CHARS.charAt(index);
    }
  } while (
    !hasLowerCase(password) ||
    !hasUpperCase(password) ||
    !hasNumber(password) ||
    !hasSpecialCharacter(password)
  );
  return password;
}
