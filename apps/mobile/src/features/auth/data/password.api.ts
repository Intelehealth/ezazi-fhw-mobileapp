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
 * been removed from the Request OTP screen. verifyOtp/resetPassword's
 * response shape is UNVERIFIED (no real OTP available to test with) — still
 * assumed to return `{ userUuid, providerUuid, role }` per the legacy model,
 * since resetPassword's URL needs a userUuid from somewhere. Re-check this
 * the same way (log the raw response) the first time a real OTP is tested.
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
}

/** Confirmed live — deliberately reveals nothing about the account. */
export interface RequestOtpResponse {
  message: string;
}

/** UNVERIFIED against the real backend — see the doc comment above. */
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
    http.post<PasswordFlowResponse>('/auth/verifyOtp', {
      verifyFor: OTP_FOR,
      phoneNumber,
      countryCode,
      otp,
    }),

  // EZ-939 — no otpToken: the legacy flow trusts the userUuid handed back by
  // verifyOtp, nothing else is threaded through.
  resetPassword: ({ userUuid, newPassword }: ResetPasswordParams) =>
    http.post<PasswordFlowResponse>(`/auth/resetPassword/${userUuid}`, { newPassword }),
};
