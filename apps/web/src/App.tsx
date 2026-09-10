import './i18n';
import { AppUIProvider } from './context/AppUIContext';
// import { useAppConfig } from './hooks/queries/useAppConfig';
import { AppRoutes } from './routes/app.routes';

function App() {
  // Config fetch-on-boot (migration guide §5) is disabled for now — no one
  // is working on the config module yet and it was just hitting the
  // placeholder example.org config URL (see @ezazi/config's DEFAULT_SERVERS)
  // on every boot. Re-enable by uncommenting the import above and the call
  // below once that module is actually being worked on.
  // useAppConfig();

  return (
    <AppUIProvider>
      <AppRoutes />
    </AppUIProvider>
  );
}

export default App;
