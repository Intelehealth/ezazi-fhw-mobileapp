import { useMutation } from '@tanstack/react-query';
import { authService } from '../../services/auth.service';
import { showToast } from '../../services/toast';
import type { RequestOtpPayload } from '../../types/auth.types';

export type RequestOtpVars = Omit<RequestOtpPayload, 'source'>;

/**
 * Used by screen 1 (forgot-username, `otpFor: 'username'`), screen 3
 * (verification-method, `otpFor: 'password'`), and screen 4's
 * (otp-verification) resend action — see auth-gateway's RequestOtpSchema.
 * `otpFor` is caller-supplied now (not hardcoded): the two screens map to
 * genuinely different backend purposes with different account-lookup rules.
 */
async function requestOtp(vars: RequestOtpVars) {
  const result = await authService.requestOtp(vars);
  if (!result.ok) throw result.error;
  return result.data;
}

export function useRequestOtp() {
  return useMutation({
    mutationFn: requestOtp,
    // The backend's own message is intentionally non-committal ("If the
    // account exists, an OTP has been sent.") — it never confirms whether the
    // phone/email actually matched an account, so this shows that text
    // verbatim rather than a more confident "OTP sent on ‹masked›" copy that
    // would misrepresent what the backend is actually promising.
    onSuccess: data => {
      showToast('OTP Sent', data.message, 'success');
    },
    onError: (error: Error) => {
      showToast('Error', error.message, 'error');
    },
  });
}
