import './i18n';
import { AppUIProvider } from './context/AppUIContext';
import { useAppConfig } from './hooks/queries/useAppConfig';
import { AppRoutes } from './routes/app.routes';

function App() {
  // Foundational config wiring per migration guide §5 — fetches once on
  // boot and syncs into the config Redux slice (see reducers/config.reducer.ts).
  useAppConfig();

  return (
    <AppUIProvider>
      <AppRoutes />
    </AppUIProvider>
  );
}

export default App;
