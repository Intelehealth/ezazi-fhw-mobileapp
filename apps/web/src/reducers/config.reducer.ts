import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppConfig } from '@ezazi/types';

export interface ConfigState {
  data: AppConfig | null;
  error: string | null;
  lastFetched: number | null;
}

const initialState: ConfigState = {
  data: null,
  error: null,
  lastFetched: null,
};

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setConfig: (state, action: PayloadAction<AppConfig>) => {
      state.data = action.payload;
      state.error = null;
      state.lastFetched = Date.now();
    },
    setConfigError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
  },
});

export const { setConfig, setConfigError } = configSlice.actions;
export const configReducer = configSlice.reducer;
