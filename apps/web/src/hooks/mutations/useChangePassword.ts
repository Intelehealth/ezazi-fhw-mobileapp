import { useMutation } from '@tanstack/react-query';
import { ApiError } from '@ezazi/api-client';
import { profileService } from '../../services/profile.service';
import { showToast } from '../../services/toast';
import { getErrorMessage } from '../../utils/error-message';

export interface ChangePasswordVars {
  oldPassword: string;
  newPassword: string;
}

/**
 * Ports change-password.component.ts's resetPassword() request —
 * AuthService.changePassword — with its "Password has been changed
 * successfully!" toast, plus a prompt to log in again since the caller signs
 * the user out afterwards. The Angular source has no error handler of its
 * own (its HTTP interceptor reports failures); here a rejected change, e.g.
 * a wrong old password, gets an error toast instead.
 */
export function useChangePassword() {
  return useMutation<void, Error | ApiError, ChangePasswordVars>({
    mutationFn: async ({ oldPassword, newPassword }) => {
      const result = await profileService.changePassword(
        oldPassword,
        newPassword
      );
      if (!result.ok) throw result.error;
    },
    onSuccess: () => {
      showToast(
        'Password Changed!',
        'Password has been changed successfully! Please log in again.',
        'success'
      );
    },
    onError: error => {
      /*
       * The change goes to OpenMRS and rides its session cookie, which times
       * out on its own schedule — a 401/403 here usually means that, not a
       * bad password (OpenMRS reports a wrong old password differently).
       */
      const sessionTimedOut =
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403);

      showToast(
        'Password Change Failed',
        sessionTimedOut
          ? 'Your OpenMRS session has timed out. Please log out and log in again, then retry.'
          : getErrorMessage(
              error,
              'Could not change your password. Please try again.'
            ),
        'error'
      );
    },
  });
}
