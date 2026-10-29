import { useState, useSyncExternalStore } from 'react';
import { logoutAfterExpiry } from '../../actions/auth.actions';
import warningIcon from '../../assets/svgs/warning-circle.svg';
import { sessionExpiry } from '../../services/session-expiry';
import { useAppDispatch } from '../../store/hooks';
import { hasFormDrafts } from '../../utils/session-snapshot';
import { ModalOverlayComponent } from '../common/modal-overlay.component';

/**
 * The hard-expiry modal. It appears when the session could not be refreshed
 * silently (the refresh token was rejected), and has to be answered: no
 * close button, and Escape or a click outside do nothing. "Log in" signs the
 * expired session out and lets the protected route send the user to the
 * login screen; the page they were on and their unsaved forms were captured
 * when the session expired and come back after they log in again.
 */
export function SessionExpiredModalComponent() {
  const expired = useSyncExternalStore(
    sessionExpiry.subscribe,
    sessionExpiry.isExpired
  );
  const dispatch = useAppDispatch();
  const [signingOut, setSigningOut] = useState(false);

  if (!expired) return null;

  async function handleLogin() {
    setSigningOut(true);
    try {
      await dispatch(logoutAfterExpiry());
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <ModalOverlayComponent>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
        aria-describedby="session-expired-message"
        className="flex w-[490px] max-w-[90%] flex-col items-center justify-center rounded-xl bg-white p-6"
      >
        <img src={warningIcon} alt="" width={80} height={80} />
        <h6
          id="session-expired-title"
          className="mt-3 text-center text-2xl leading-[150%] font-bold text-[#1B163A]"
        >
          Session expired
        </h6>
        <p
          id="session-expired-message"
          className="mt-2 text-center text-lg leading-[150%] text-[#7F7B92]"
        >
          Your session has expired. Please log in again to continue.
          {hasFormDrafts() &&
            ' Your unsaved changes will be restored after you log in.'}
        </p>
        <button
          type="button"
          onClick={handleLogin}
          disabled={signingOut}
          className="mt-4 min-h-12 min-w-[119px] cursor-pointer rounded-lg border border-[#2E1E91] bg-[#2E1E91] px-6 py-2 text-lg leading-[150%] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Log in
        </button>
      </div>
    </ModalOverlayComponent>
  );
}
