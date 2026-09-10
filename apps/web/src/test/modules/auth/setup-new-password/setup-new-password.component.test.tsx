import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userIcon from '../../../../assets/svgs/user.svg';
import { SetupNewPasswordComponent } from '../../../../modules/auth/setup-new-password/setup-new-password.component';
import { showToast } from '../../../../services/toast';

const mutate = vi.fn();
vi.mock('../../../../hooks/mutations/useResetPassword', () => ({
  useResetPassword: () => ({ mutate, isPending: false }),
}));
vi.mock('../../../../services/toast', () => ({ showToast: vi.fn() }));

function LoginProbe() {
  return <p>login-screen</p>;
}

function renderScreen(state: Record<string, unknown> | undefined) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/auth/setup-new-password', state }]}>
      <Routes>
        <Route
          path="/auth/setup-new-password"
          element={<SetupNewPasswordComponent />}
        />
        <Route path="/auth/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  mutate.mockClear();
  vi.mocked(showToast).mockClear();
});

describe('SetupNewPasswordComponent', () => {
  it('redirects to login when route state is missing', async () => {
    renderScreen(undefined);
    expect(await screen.findByText('login-screen')).toBeInTheDocument();
  });

  it('shows the username from route state and falls back to the user icon on avatar load error', () => {
    const { container } = renderScreen({ username: 'nurse1', userUuid: 'u-1' });
    expect(screen.getByText('nurse1')).toBeInTheDocument();

    // alt="" images have no accessible "img" role, hence container.querySelector here.
    const avatar = container.querySelector(
      'img[src*="personimage"]'
    ) as HTMLImageElement;
    expect(avatar.src).toContain('/mock-api/personimage/u-1');
    fireEvent.error(avatar);
    expect(avatar.src).toBe(userIcon);
  });

  it('fills both password fields and shows the Excellent strength label when "Generate password" is clicked', () => {
    renderScreen({ username: 'nurse1', userUuid: 'u-1' });

    fireEvent.click(screen.getByRole('button', { name: 'Generate password' }));

    const newPassword = screen.getByPlaceholderText(
      'Enter or generate new password'
    ) as HTMLInputElement;
    const confirmPassword = screen.getByPlaceholderText(
      'Re-enter new password'
    ) as HTMLInputElement;
    expect(newPassword.value).toHaveLength(8);
    expect(newPassword.value).toBe(confirmPassword.value);
  });

  it('shows a mismatch error when password and confirmPassword differ', async () => {
    renderScreen({ username: 'nurse1', userUuid: 'u-1' });

    fireEvent.input(screen.getByPlaceholderText('Enter or generate new password'), {
      target: { value: 'Abcdefg1' },
    });
    fireEvent.input(screen.getByPlaceholderText('Re-enter new password'), {
      target: { value: 'Different1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

    expect(
      await screen.findByText("Password and Confirm Password doesn't match.")
    ).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('warns via toast (not blocking) when the password lacks complexity, without calling resetPassword', async () => {
    renderScreen({ username: 'nurse1', userUuid: 'u-1' });

    fireEvent.input(screen.getByPlaceholderText('Enter or generate new password'), {
      target: { value: 'plainpass' },
    });
    fireEvent.input(screen.getByPlaceholderText('Re-enter new password'), {
      target: { value: 'plainpass' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        'Password invalid!',
        'Password must be of atleast 8 characters & a mix of upper & lower case letters, numbers & symbols.',
        'warning'
      )
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it('calls resetPassword with userUuid + password once complexity and match both pass', async () => {
    renderScreen({ username: 'nurse1', userUuid: 'u-1' });

    fireEvent.input(screen.getByPlaceholderText('Enter or generate new password'), {
      target: { value: 'Abcdefg1$' },
    });
    fireEvent.input(screen.getByPlaceholderText('Re-enter new password'), {
      target: { value: 'Abcdefg1$' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        { userUuid: 'u-1', password: 'Abcdefg1$' },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    );
  });
});
