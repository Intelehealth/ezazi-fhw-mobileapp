import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { ApiError } from '@ezazi/api-client';
import { loginSuccess } from '../../reducers/auth.reducer';
import { resolvePostLoginPath } from '../../routes/paths';
import { authService } from '../../services/auth.service';
import { useAppDispatch } from '../../store/hooks';
import type {
  AuthGatewayLoginResponse,
  AuthUser,
  LoginCredentials,
} from '../../types/auth.types';
import { storage } from '../../utils/storage';

/** Matches the backend's own casing — uppercased below when building AuthUser. */
const NURSE_ROLE = 'ORGANIZATIONAL: NURSE';

interface LoginResult {
  token: string;
  user: AuthUser;
}

function toAuthUser(response: AuthGatewayLoginResponse): AuthUser {
  return {
    uuid: response.user.uuid,
    username: response.user.username,
    displayName: response.provider.display,
    roles: response.user.roles.map(role => role.toUpperCase()),
  };
}

/**
 * Single auth-gateway call does the whole login (see services/auth.service.ts) —
 * no multi-step OpenMRS session/provider orchestration needed here, unlike
 * an earlier pass that assumed the Angular app's separate `authService.login()`
 * + `getProvider()` calls carried over verbatim. Confirmed against the real
 * endpoint: one POST returns the token, user, and provider together, and a
 * wrong password comes back as a 401 with `{error:{code,message}}` — which
 * @ezazi/api-client's mapAxiosError already turns into an ApiError carrying
 * the backend's own message, so `error.message` in the UI is accurate
 * as-is; no special-casing needed for that path.
 *
 * The `authenticated: false` check below is a defensive fallback for a
 * theoretical 200-but-not-authenticated response — not something this API
 * has actually been observed to return (it uses a real 401 instead) — kept
 * in case that ever changes.
 *
 * NOT ported: login.component.ts retries this whole call up to 3 times on
 * any error before giving up. That's an unconditional retry with no
 * backoff on every error kind (including ones that will never succeed on
 * retry), which just adds latency and hides real failures — see this
 * function's git history for the fuller reasoning from when this backed a
 * 3-step flow instead of one call. Still not reintroduced here.
 */
async function performLogin(
  credentials: LoginCredentials
): Promise<LoginResult> {
  const result = await authService.login(credentials);
  if (!result.ok) throw result.error;
  if (!result.data.authenticated) {
    throw new Error("Couldn't find you, credentials provided are wrong.");
  }

  return { token: result.data.accessToken, user: toAuthUser(result.data) };
}

/**
 * React Query mutation for the login module (migration guide §5). Persists
 * the session to the Redux auth slice (not localStorage directly, beyond
 * the token itself — see utils/storage.ts) and redirects by role.
 */
export function useLogin() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  return useMutation<LoginResult, Error | ApiError, LoginCredentials>({
    mutationFn: performLogin,
    onSuccess: ({ token, user }) => {
      storage.setAuthToken(token);
      dispatch(loginSuccess({ token, user }));

      const isNurse = user.roles.includes(NURSE_ROLE);
      navigate(resolvePostLoginPath(isNurse));
    },
  });
}
