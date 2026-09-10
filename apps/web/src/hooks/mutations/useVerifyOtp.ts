import { useMutation } from '@tanstack/react-query';
import { showToast } from '../../services/toast';
import type { ContactMethod } from '../../utils/mask-contact';
import { simulateNetworkDelay } from './mock-utils';

export interface VerifyOtpVars {
  otp: string;
  verificationFor: 'forgot-username' | 'forgot-password';
  via: ContactMethod;
  value: string;
  username?: string;
}

export interface VerifyOtpResult {
  success: true;
  /** Mocked — carried into setup-new-password's route state for the forgot-password case. */
  userUuid: string;
}

const MOCK_USER_UUID = 'mock-user-uuid-1234';
/** OTP has no letters to type "fail" into, so 000000 is its dedicated failure code (see mock-utils.ts). */
const OTP_FAILURE_CODE = '000000';

async function verifyOtp(vars: VerifyOtpVars): Promise<VerifyOtpResult> {
  await simulateNetworkDelay();
  if (vars.otp === OTP_FAILURE_CODE) {
    throw new Error('Please enter valid otp');
  }
  return { success: true, userUuid: MOCK_USER_UUID };
}

/**
 * Used by screen 4 (otp-verification) for both cases it supports.
 * verifyForgetUsername's success toast is ported here (matching
 * otp-verification.component.ts's toastr.success call); verifyForgetPassword
 * has no success toast in the Angular source either, so none is added here —
 * navigation for both cases is otp-verification.component.tsx's own job via
 * mutate(vars, { onSuccess }).
 */
export function useVerifyOtp() {
  return useMutation<VerifyOtpResult, Error, VerifyOtpVars>({
    mutationFn: verifyOtp,
    onSuccess: (_data, vars) => {
      if (vars.verificationFor === 'forgot-username') {
        showToast(
          'Username Sent',
          'Username has been successfully sent on your email and mobile number',
          'success'
        );
      }
    },
    onError: error => {
      showToast('Error', error.message, 'error');
    },
  });
}
