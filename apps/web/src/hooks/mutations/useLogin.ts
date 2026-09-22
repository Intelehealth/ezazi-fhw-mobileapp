import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { ApiError } from '@ezazi/api-client';
import { authService } from '../../services/auth.service';
import { loginSuccess } from '../../reducers/auth.reducer';
import { useAppDispatch } from '../../store/hooks';
import { storage } from '../../utils/storage';
import { ROUTES } from '../../routes/paths';
import type { LoginCredentials, LoginResponse } from '../../types/auth.types';

/**
 * React Query mutation for the login example module (migration guide §5,
 * §7 step 3). Every later write-flow (add-patient, submit-diagnosis, ...)
 * copies this shape: call the *.service.ts method, throw the ApiError on
 * failure so React Query's isError/error fire, persist + sync Redux on
 * success.
 */
export function useLogin() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  return useMutation<LoginResponse, ApiError, LoginCredentials>({
    mutationFn: async credentials => {
      const result = await authService.login(credentials);
      if (!result.ok) throw result.error;
      return result.data;
    },
    onSuccess: ({ token, user }) => {
      storage.setAuthToken(token);
      storage.setStoredUser(JSON.stringify(user));
      dispatch(loginSuccess({ token, user }));
      navigate(ROUTES.ROOT);
    },
  });
}
