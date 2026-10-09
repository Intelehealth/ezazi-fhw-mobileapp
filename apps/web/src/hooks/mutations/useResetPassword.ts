import { useMutation } from '@tanstack/react-query';
import { authService } from '../../services/auth.service';
import { showToast } from '../../services/toast';

export interface ResetPasswordVars {
  userUuid: string;
  newPassword: string;
  /** Minted by a successful verifyOtp — see auth-gateway's ResetPasswordSchema. */
  resetToken: string;
}

/**
 * Used by screen 5 (setup-new-password). Angular's resetPassword() opens a
 * modal (coreService.openPasswordResetSuccessModal()) on success instead of
 * a toast — apps/web has no ported modal component yet, so a success toast
 * stands in here. Navigation back to login is still setup-new-password.component.tsx's
 * own job via mutate(vars, { onSuccess }).
 */
async function resetPassword(vars: ResetPasswordVars) {
  const result = await authService.resetPassword(vars.userUuid, {
    newPassword: vars.newPassword,
    resetToken: vars.resetToken,
  });
  if (!result.ok) throw result.error;
  return result.data;
}

export function useResetPassword() {
  return useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      showToast(
        'Password Reset',
        'Your password has been reset successfully.',
        'success'
      );
    },
    onError: (error: Error) => {
      showToast('Error', error.message, 'error');
    },
  });
}
