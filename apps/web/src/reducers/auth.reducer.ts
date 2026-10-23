import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, AuthUser } from '../types/auth.types';

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (
      state,
      action: PayloadAction<{ token: string; user: AuthUser }>
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },
    /* A silent refresh replaced the access token; nothing else about the session changed. */
    tokenRefreshed: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    loggedOut: () => initialState,
  },
});

export const { loginSuccess, tokenRefreshed, loggedOut } = authSlice.actions;
export const authReducer = authSlice.reducer;
