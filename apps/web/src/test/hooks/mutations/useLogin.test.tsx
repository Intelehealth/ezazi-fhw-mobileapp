import { act, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureStore } from '@reduxjs/toolkit';
import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { success } from '@ezazi/api-client';
import { rootReducer } from '../../../reducers';
import { useLogin } from '../../../hooks/mutations/useLogin';
import { authService } from '../../../services/auth.service';

vi.mock('../../../services/auth.service', () => ({
  authService: { login: vi.fn() },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const store = configureStore({ reducer: rootReducer });
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <MemoryRouter>{children}</MemoryRouter>
      </Provider>
    </QueryClientProvider>
  );
}

describe('useLogin', () => {
  it('persists the token and marks the mutation successful on a valid login', async () => {
    vi.mocked(authService.login).mockResolvedValue(
      success({
        token: 'tok-123',
        user: {
          uuid: '1',
          username: 'nurse1',
          displayName: 'Nurse One',
          roles: [],
        },
      })
    );

    const { result } = renderHook(() => useLogin(), { wrapper });

    act(() => {
      result.current.mutate({ username: 'nurse1', password: 'secret123' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(localStorage.getItem('ezazi_web_auth_token')).toBe('tok-123');
  });
});
