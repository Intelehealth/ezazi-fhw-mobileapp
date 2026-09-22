import { apiClient } from '@/core/api/client';
import { createRequestMethods } from '@/core/api/responseHandler';

/**
 * Password-recovery endpoints — EZ-933, 934, 939.
 *
 * Request BODY shape (field names, endpoint paths) verified against the
 * legacy Android app (ui/password/{data,model}/*.java —
 * ForgotPasswordServiceDataSource, RequestOTPModel, VerifyOtpRequestModel,
 * ChangePasswordRequestModel, ApiInterface) — confirmed live: an earlier
 * mismatched body (`phone`/`code` instead of `phoneNumber`/`otp`, missing
 * `otpFor`) came back as a 400 VALIDATION_ERROR naming exactly the legacy
 * field names.
 *
 * RESPONSE shape does NOT match the legacy app's PasswordResponseModel,
 * though — this backend was redesigned to not leak account existence/role.
 * Confirmed live (2026-09-17): `requestOtp` returns only
 * `{ message: "If the account exists, an OTP has been sent." }`, no
 * userUuid/providerUuid/role. There is no way to gate on "must be a Nurse
 * account" at this step any more — that check (and its legacy copy) has
 * been removed from the Request OTP screen.
 *
 * verifyOtp's response CONFIRMED live (2026-09-22, via the logged response —
 * see ForgotPasswordVerifyOtpScreen.tsx): `{ verified, userUuid, resetToken,
 * expiresIn }` — no providerUuid/role. `resetToken` is a short-lived
 * (expiresIn: 600s) JWT that authenticates the resetPassword call; it
 * supersedes the legacy assumption that userUuid alone was enough. It must
 * come fresh off this response every time — never cached/reused across a
 * resend, since a new verify issues a new token. resetPassword's own
 * response shape is still unverified, but unused by the caller (only `.ok`
 * matters there), so it isn't worth chasing.
 *
 * Feature-owned on purpose: only the Forgot Password screens call these, so
 * nothing in `core/` depends on them. Session lifecycle (login/logout/refresh/
 * check) is the opposite case and lives in `core/session/session.api.ts`.
 */

const http = createRequestMethods(apiClient);

// Legacy ForgotPasswordFragment.OTPForString / the hardcoded "mobile" source —
// this flow has only ever had one otpFor/source value, so callers don't pass them.
const OTP_FOR = 'password';
const OTP_SOURCE = 'mobile';

export interface RequestOtpParams {
  phoneNumber: string;
  /** Bare digits, no "+" (e.g. "91") — matches CountryCodePicker.getSelectedCountryCode(). */
  countryCode: string;
}

export interface VerifyOtpParams {
  phoneNumber: string;
  countryCode: string;
  otp: string;
}

export interface ResetPasswordParams {
  userUuid: string;
  newPassword: string;
  /** From verifyOtp's response — see the doc comment above. */
  resetToken: string;
}

/** Confirmed live — deliberately reveals nothing about the account. */
export interface RequestOtpResponse {
  message: string;
}

/** Confirmed live (2026-09-22) — see the doc comment above. */
export interface VerifyOtpResponse {
  verified: boolean;
  userUuid: string;
  resetToken: string;
  /** Seconds until resetToken expires (600 = 10 minutes). */
  expiresIn: number;
}

/** UNVERIFIED against the real backend, and unused — see the doc comment above. */
export interface PasswordFlowResponse {
  userUuid: string;
  providerUuid: string;
  role: string;
}

export const passwordApi = {
  // EZ-933
  requestOtp: ({ phoneNumber, countryCode }: RequestOtpParams) =>
    http.post<RequestOtpResponse>('/auth/requestOtp', {
      otpFor: OTP_FOR,
      phoneNumber,
      countryCode,
      source: OTP_SOURCE,
    }),

  // EZ-934
  verifyOtp: ({ phoneNumber, countryCode, otp }: VerifyOtpParams) =>
    http.post<VerifyOtpResponse>('/auth/verifyOtp', {
      verifyFor: OTP_FOR,
      phoneNumber,
      countryCode,
      otp,
    }),

  // EZ-939 — resetToken (from verifyOtp) authenticates the request, not just
  // the userUuid in the URL.
  resetPassword: ({ userUuid, newPassword, resetToken }: ResetPasswordParams) =>
    http.post<PasswordFlowResponse>(`/auth/resetPassword/${userUuid}`, { newPassword, resetToken }),
};
