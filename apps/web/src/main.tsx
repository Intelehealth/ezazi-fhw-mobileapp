import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import { queryClient } from './config/query-client';
import './index.css';
import { store } from './store/store';

/**
 * Provider order per migration guide §5/§6: QueryClientProvider outermost
 * (server-cache state, owned independently of the app's client state)
 * wrapping the Redux Provider (auth/config client state) wrapping App.
 * (Sentry wiring from the guide's own main.tsx example is deliberately
 * deferred — @sentry/react isn't in this pass's dependency list.)
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <App />
      </Provider>
    </QueryClientProvider>
  </StrictMode>
);
