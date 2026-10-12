import { useAppSelector } from '../store/hooks';

/** Matches the backend's own casing — uppercased when building AuthUser (see hooks/mutations/useLogin.ts). */
export const NURSE_ROLE = 'ORGANIZATIONAL: NURSE';

/**
 * Ports the Angular app's `*ngxPermissionsOnly/Except="['ORGANIZATIONAL: NURSE']"`
 * checks: nurses get the hw-profile screen and a trimmed sidebar, everyone
 * else gets the doctor profile.
 */
export function useIsNurse(): boolean {
  return useAppSelector(
    state => state.auth.user?.roles?.includes(NURSE_ROLE) ?? false
  );
}
