import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ForgotPasswordComponent } from '../../../../modules/auth/forgot-password/forgot-password.component';

function DestinationProbe() {
  return <p>verification-method-screen</p>;
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/auth/forgot-password']}>
      <Routes>
        <Route path="/auth/forgot-password" element={<ForgotPasswordComponent />} />
        <Route path="/auth/verification-method" element={<DestinationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ForgotPasswordComponent', () => {
  it('renders the forgot-username link pointing at its auth route', () => {
    renderScreen();
    expect(
      screen.getByRole('link', { name: 'Forgot Username ?' })
    ).toHaveAttribute('href', '/auth/forgot-username');
  });

  it('shows a validation message after a submit attempt with username left blank', async () => {
    const { container } = renderScreen();
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByText('Please enter username')).toBeInTheDocument();
  });

  it('does NOT call any API — it navigates straight to verification-method with the username in route state', async () => {
    renderScreen();

    fireEvent.input(screen.getByPlaceholderText('Enter username'), {
      target: { value: 'nurse1' },
    });
    const submitButton = screen.getByRole('button', { name: /next/i });
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    fireEvent.click(submitButton);

    expect(await screen.findByText('verification-method-screen')).toBeInTheDocument();
  });
});
