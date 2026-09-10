import { useMutation } from '@tanstack/react-query';
import { showToast } from '../../services/toast';
import { shouldSimulateFailure, simulateNetworkDelay } from './mock-utils';

export interface ResetPasswordVars {
  userUuid: string;
  password: string;
}

export interface ResetPasswordResult {
  success: true;
}

/** Mocked network call — see mock-utils.ts's module comment for the fail-substring convention. */
async function resetPassword(
  vars: ResetPasswordVars
): Promise<ResetPasswordResult> {
  await simulateNetworkDelay();
  if (shouldSimulateFailure(vars.password)) {
    throw new Error('Something went wrong, please try again.');
  }
  return { success: true };
}

/**
 * Used by screen 5 (setup-new-password). Angular's resetPassword() opens a
 * modal (coreService.openPasswordResetSuccessModal()) on success instead of
 * a toast — apps/web has no ported modal component yet, so a success toast
 * stands in here. Navigation back to login is still setup-new-password.component.tsx's
 * own job via mutate(vars, { onSuccess }).
 */
export function useResetPassword() {
  return useMutation<ResetPasswordResult, Error, ResetPasswordVars>({
    mutationFn: resetPassword,
    onSuccess: () => {
      showToast(
        'Password Reset',
        'Your password has been reset successfully.',
        'success'
      );
    },
    onError: error => {
      showToast('Error', error.message, 'error');
    },
  });
}
