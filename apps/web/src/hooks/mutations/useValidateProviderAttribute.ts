import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@ezazi/api-client';
import { profileService } from '../../services/profile.service';
import type { ValidateProviderAttributePayload } from '../../types/profile.types';

/**
 * Ports profile.component.ts's email/phone "already exists" check
 * (ProviderAttributeValidator / AuthService.validateProviderAttribute).
 * No Redux/toast side effects here — just the raw availability flag
 * (`true` = available); the calling field decides how to show it, matching
 * the Angular form's inline success/error icon rather than a toast.
 */
export function useValidateProviderAttribute() {
  return useMutation<boolean, ApiError, ValidateProviderAttributePayload>({
    mutationFn: async payload => {
      const result = await profileService.validateProviderAttribute(payload);
      if (!result.ok) throw result.error;
      return result.data.data;
    },
  });
}
