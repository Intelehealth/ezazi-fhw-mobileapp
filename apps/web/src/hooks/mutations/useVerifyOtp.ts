import { useMutation } from '@tanstack/react-query';
import { authService } from '../../services/auth.service';
import { showToast } from '../../services/toast';
import type { VerifyOtpPayload } from '../../types/auth.types';

export type VerifyOtpVars = VerifyOtpPayload;

/**
 * Used by screen 4 (otp-verification) for both purposes it supports — see
 * auth-gateway's VerifyOtpSchema/VerifyOtpResponse. `verifyFor: 'password'`
 * resolves with `resetToken`, which setup-new-password's resetPassword call
 * needs; `verifyFor: 'username'` resolves with neither (the backend emails
 * the recovered username directly). Navigation/success-toast copy for
 * either case is otp-verification.component.tsx's own job via
 * mutate(vars, { onSuccess }), not this hook's — the two purposes go
 * different places on success.
 */
async function verifyOtp(vars: VerifyOtpVars) {
  const result = await authService.verifyOtp(vars);
  if (!result.ok) throw result.error;
  return result.data;
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: verifyOtp,
    onError: (error: Error) => {
      showToast('Error', error.message, 'error');
    },
  });
}
