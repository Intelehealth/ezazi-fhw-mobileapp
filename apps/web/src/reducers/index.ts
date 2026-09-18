import { combineReducers } from '@reduxjs/toolkit';
import { authReducer } from './auth.reducer';
import { configReducer } from './config.reducer';

/**
 * auth + config only, per migration guide §5's "what goes where" table —
 * every server-data need goes through React Query (config/query-client.ts),
 * not a Redux slice.
 */
export const rootReducer = combineReducers({
  auth: authReducer,
  config: configReducer,
});
