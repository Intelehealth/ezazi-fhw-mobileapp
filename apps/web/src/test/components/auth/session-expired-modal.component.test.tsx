import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionExpiredModalComponent } from '../../../components/auth/session-expired-modal.component';
import { sessionExpiry } from '../../../services/session-expiry';
import { useAppDispatch } from '../../../store/hooks';

const logoutAfterExpiry = vi.hoisted(() => vi.fn());
vi.mock('../../../actions/auth.actions', () => ({
  logoutAfterExpiry: () => logoutAfterExpiry(),
}));

/* Same dual-React hoisting hazard dashboard.page.test.tsx documents. */
vi.mock('../../../store/hooks', () => ({ useAppDispatch: vi.fn() }));

const dispatch = vi.fn();

beforeEach(() => {
  dispatch.mockReset().mockResolvedValue(undefined);
  vi.mocked(useAppDispatch).mockReturnValue(dispatch);
  logoutAfterExpiry.mockReset().mockReturnValue('logout-after-expiry-thunk');
  sessionExpiry.reset();
});

afterEach(() => {
  sessionExpiry.reset();
});

describe('SessionExpiredModalComponent', () => {
  it('renders nothing while the session is valid', () => {
    render(<SessionExpiredModalComponent />);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('appears as soon as the session hard-expires, and goes away when it is reset', () => {
    render(<SessionExpiredModalComponent />);

    act(() => sessionExpiry.markExpired());
    expect(
      screen.getByRole('alertdialog', { name: 'Session expired' })
    ).toBeInTheDocument();
    expect(screen.getByText(/your session has expired/i)).toBeInTheDocument();

    act(() => sessionExpiry.reset());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('has to be answered: Escape and a click outside do not dismiss it', () => {
    act(() => sessionExpiry.markExpired());
    const { container } = render(<SessionExpiredModalComponent />);

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseDown(container.firstElementChild as HTMLElement);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Close' })
    ).not.toBeInTheDocument();
  });

  it('signs the expired session out, keeping the snapshot, when "Log in" is pressed', async () => {
    act(() => sessionExpiry.markExpired());
    render(<SessionExpiredModalComponent />);

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith('logout-after-expiry-thunk')
    );
  });

  it('disables "Log in" while signing out, and re-enables it afterwards', async () => {
    let finishSignOut: () => void = () => undefined;
    dispatch.mockReturnValue(
      new Promise<void>(resolve => (finishSignOut = resolve))
    );
    act(() => sessionExpiry.markExpired());
    render(<SessionExpiredModalComponent />);

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(screen.getByRole('button', { name: 'Log in' })).toBeDisabled();

    await act(async () => finishSignOut());
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
  });
});
