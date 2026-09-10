export type ContactMethod = 'phone' | 'email';

/**
 * Ported verbatim from forgot-username.component.ts / verification-method.component.ts's
 * `replaceWithStar` — keeps the first 5 characters and the last 2 (phone) or
 * 4 (email) visible, replacing everything between with a fixed 5-character
 * "*****" run (not a per-character mask). Used to build the "OTP sent on
 * ⁠*****" toast copy in useRequestOtp.ts.
 */
export function maskContact(value: string, via: ContactMethod): string {
  const length = value.length;
  const visibleEnd = via === 'phone' ? length - 2 : length - 4;
  const middle = value.substring(5, visibleEnd);
  return value.replace(middle, '*****');
}
