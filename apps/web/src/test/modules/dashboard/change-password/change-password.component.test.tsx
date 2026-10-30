import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangePasswordComponent } from '../../../../modules/dashboard/change-password/change-password.component';
import { showToast } from '../../../../services/toast';
import { useAppDispatch } from '../../../../store/hooks';

const mutate = vi.hoisted(() => vi.fn());
const changePassword = vi.hoisted(() => ({ mutate, isPending: false }));

vi.mock('../../../../hooks/mutations/useChangePassword', () => ({
  useChangePassword: () => changePassword,
}));

vi.mock('../../../../services/toast', () => ({ showToast: vi.fn() }));

/* Same dual-React hoisting hazard dashboard.page.test.tsx documents. */
vi.mock('../../../../store/hooks', () => ({ useAppDispatch: vi.fn() }));

vi.mock('../../../../actions/auth.actions', () => ({
  logout: () => 'logout-thunk',
}));

const oldField = () => screen.getByPlaceholderText('Enter old password');
/* The label also holds the "Generate password" link, so fields are found by placeholder. */
const newField = () =>
  screen.getByPlaceholderText('Enter or generate new password');
const confirmField = () => screen.getByPlaceholderText('Re-enter new password');
const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));

function fill(
  oldPassword: string,
  password: string,
  confirmPassword = password
) {
  fireEvent.change(oldField(), { target: { value: oldPassword } });
  fireEvent.change(newField(), { target: { value: password } });
  fireEvent.change(confirmField(), { target: { value: confirmPassword } });
}

const dispatch = vi.fn();

beforeEach(() => {
  dispatch.mockReset();
  vi.mocked(useAppDispatch).mockReturnValue(dispatch);
  mutate.mockReset();
  changePassword.isPending = false;
  vi.mocked(showToast).mockReset();
});

describe('ChangePasswordComponent', () => {
  it('renders the title, the three password fields and the strength meter', () => {
    render(<ChangePasswordComponent />);

    expect(screen.getByText('Change password')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your new password must be different to the previously used passwords.'
      )
    ).toBeInTheDocument();
    expect(oldField()).toHaveAttribute('placeholder', 'Enter old password');
    expect(newField()).toHaveAttribute(
      'placeholder',
      'Enter or generate new password'
    );
    expect(confirmField()).toHaveAttribute(
      'placeholder',
      'Re-enter new password'
    );
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('shows required-field errors only after the first submit', async () => {
    render(<ChangePasswordComponent />);
    expect(
      screen.queryByText('Please enter old password')
    ).not.toBeInTheDocument();

    submit();

    expect(
      await screen.findByText('Please enter old password')
    ).toBeInTheDocument();
    expect(screen.getAllByText('Please enter password')).toHaveLength(2);
    expect(mutate).not.toHaveBeenCalled();
  });

  it('asks for at least 8 characters in the new and confirm fields', async () => {
    render(<ChangePasswordComponent />);

    fill('Old@1234', 'Ab1$');
    submit();

    expect(
      await screen.findAllByText('Please enter atleast 8 characters')
    ).toHaveLength(2);
    expect(mutate).not.toHaveBeenCalled();
  });

  it('warns instead of changing the password when the new and confirm passwords differ', async () => {
    render(<ChangePasswordComponent />);

    fill('Old@1234', 'Abcdef1$x', 'Abcdef1$y');
    submit();

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        "Password doesn't match!",
        "New Password and Confirm Password doesn't match.",
        'warning'
      )
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it.each([
    ['no lower case letter', 'ABCDEF1$X'],
    ['no upper case letter', 'abcdef1$x'],
    ['no number', 'Abcdefg$x'],
    ['no symbol', 'Abcdefg1x'],
  ])(
    'warns instead of changing the password when it has %s',
    async (_reason, password) => {
      render(<ChangePasswordComponent />);

      fill('Old@1234', password);
      submit();

      await waitFor(() =>
        expect(showToast).toHaveBeenCalledWith(
          'Password invalid!',
          'Password must be of atleast 8 characters & a mix of upper & lower case letters, numbers & symbols.',
          'warning'
        )
      );
      expect(mutate).not.toHaveBeenCalled();
    }
  );

  it('changes the password with the old and new values, then logs the user out once it succeeds', async () => {
    mutate.mockImplementation(
      (_vars: unknown, options: { onSuccess: () => void }) =>
        options.onSuccess()
    );
    render(<ChangePasswordComponent />);

    fill('Old@1234', 'Abcdef1$x');
    submit();

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        { oldPassword: 'Old@1234', newPassword: 'Abcdef1$x' },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    );
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith('logout-thunk'));
  });

  it('keeps what was typed, and stays signed in, when the change fails', async () => {
    mutate.mockImplementation(() => undefined);
    render(<ChangePasswordComponent />);

    fill('Old@1234', 'Abcdef1$x');
    submit();

    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(oldField()).toHaveValue('Old@1234');
    expect(newField()).toHaveValue('Abcdef1$x');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('fills both new-password fields with a generated password that meets the rules', async () => {
    render(<ChangePasswordComponent />);

    fireEvent.click(screen.getByRole('button', { name: 'Generate password' }));

    await waitFor(() =>
      expect((newField() as HTMLInputElement).value).toHaveLength(8)
    );
    const generated = (newField() as HTMLInputElement).value;
    expect(confirmField()).toHaveValue(generated);
    expect(generated).toMatch(/[a-z]/);
    expect(generated).toMatch(/[A-Z]/);
    expect(generated).toMatch(/[0-9]/);
    expect(generated).toMatch(/[^A-Za-z0-9]/);
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('updates the strength meter as the new password is typed', async () => {
    render(<ChangePasswordComponent />);

    fireEvent.change(newField(), { target: { value: 'Abcdef1$ghij' } });

    expect(await screen.findByText('Excellent')).toBeInTheDocument();
  });

  it('shows the button outlined while the form is invalid and filled once it is valid', async () => {
    render(<ChangePasswordComponent />);
    const button = () =>
      screen.getByRole('button', { name: 'Change Password' });

    expect(button().className).toContain('border-[#2E1E91]');
    expect(button()).not.toBeDisabled();

    fill('Old@1234', 'Abcdef1$x');

    await waitFor(() => expect(button().className).toContain('bg-[#2E1E91]'));
    expect(button().className).not.toContain('border-[3px]');
  });

  it('disables the button while the change is in flight', () => {
    changePassword.isPending = true;
    render(<ChangePasswordComponent />);

    expect(
      screen.getByRole('button', { name: 'Change Password' })
    ).toBeDisabled();
  });
});
