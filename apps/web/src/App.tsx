import 'react-toastify/dist/ReactToastify.css';
import './styles/toast-theme.css';
import './i18n';
import { ToastContainer } from 'react-toastify';
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

      {/*
        Props match intelehealth-hw-webapp-react's reference ToastContainer
        (src/App.tsx, dev branch) with one deliberate deviation:
        closeOnClick is false here (the reference has it enabled) to match
        intelehealth-doctor-webapp's actual ngx-toastr config
        (ToastrModule.forRoot({ tapToDismiss: false }), ezazi_dev_master
        src/app/app.module.ts) — dismissal in that product is closeButton
        only, not click-anywhere-on-the-toast.
      */}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </AppUIProvider>
  );
}

export default App;
