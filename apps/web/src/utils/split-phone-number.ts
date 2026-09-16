/**
 * Splits a react-international-phone E.164 value (e.g. "+919876543210") into
 * just the national number, given the selected country's dial code (e.g.
 * "91") — the shape auth-gateway's real /auth/requestOtp and /auth/verifyOtp
 * expect (`phoneNumber` + a separate `countryCode`), not one combined string.
 * See components/auth/contact-tabs.component.tsx for where the dial code
 * itself comes from.
 */
export function splitE164Phone(value: string, dialCode: string): string {
  const prefix = `+${dialCode}`;
  return value.startsWith(prefix) ? value.slice(prefix.length) : value.replace(/^\+/, '');
}
