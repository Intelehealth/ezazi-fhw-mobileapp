import { useMutation } from '@tanstack/react-query';
import { showToast } from '../../services/toast';
import { maskContact, type ContactMethod } from '../../utils/mask-contact';
import { shouldSimulateFailure, simulateNetworkDelay } from './mock-utils';

export interface RequestOtpVars {
  otpFor: 'username' | 'password';
  via: ContactMethod;
  value: string;
  /** Present for otpFor: 'password' — the username entered on forgot-password. */
  username?: string;
}

export interface RequestOtpResult {
  success: true;
}

/**
 * Mocked network call — see mock-utils.ts's module comment for the
 * fail-substring convention this branches on.
 */
async function requestOtp(vars: RequestOtpVars): Promise<RequestOtpResult> {
  await simulateNetworkDelay();
  if (shouldSimulateFailure(vars.value)) {
    throw new Error("Couldn't send OTP, please try again.");
  }
  return { success: true };
}

/**
 * Used by screen 1 (forgot-username), screen 3 (verification-method), and
 * screen 4's (otp-verification) resend action — see hooks/mutations shape
 * convention (useLogin.ts). This hook only owns the fixed toast copy
 * (matching forgot-username.component.ts / verification-method.component.ts's
 * toastr calls); navigation is each call site's own mutate(vars, { onSuccess })
 * callback since the three callers each go somewhere different next.
 */
export function useRequestOtp() {
  return useMutation<RequestOtpResult, Error, RequestOtpVars>({
    mutationFn: requestOtp,
    onSuccess: (_data, vars) => {
      const masked = maskContact(vars.value, vars.via);
      showToast('OTP Sent', `OTP sent on ${masked} successfully!`, 'success');
    },
    onError: error => {
      showToast('Error', error.message, 'error');
    },
  });
}
