import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContactTabsComponent } from '../../../components/auth/contact-tabs.component';

function registration() {
  return { name: 'email', onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() };
}

describe('ContactTabsComponent', () => {
  it('renders the phone field (with a country selector) when active is "phone" and switches to email on tab click', () => {
    const onActiveChange = vi.fn();
    render(
      <ContactTabsComponent
        active="phone"
        onActiveChange={onActiveChange}
        phoneValue=""
        onPhoneChange={vi.fn()}
        emailRegistration={registration()}
      />
    );

    expect(screen.getByPlaceholderText('Enter Mobile Number')).toBeInTheDocument();
    // The country selector button carries role="combobox" (it opens a
    // listbox of countries), overriding its implicit <button> role.
    expect(screen.getByRole('combobox', { name: 'Country selector' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter Email ID')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Email ID' }));
    expect(onActiveChange).toHaveBeenCalledWith('email');
  });

  it('shows the phone error message when active is "phone"', () => {
    render(
      <ContactTabsComponent
        active="phone"
        onActiveChange={vi.fn()}
        phoneValue=""
        onPhoneChange={vi.fn()}
        emailRegistration={registration()}
        phoneError="Please enter valid mobile number"
      />
    );

    expect(
      screen.getByText('Please enter valid mobile number')
    ).toBeInTheDocument();
  });

  it('delegates a click anywhere in box 1 (the dial-code preview) to the real country-selector button', () => {
    const { container } = render(
      <ContactTabsComponent
        active="phone"
        onActiveChange={vi.fn()}
        phoneValue=""
        onPhoneChange={vi.fn()}
        emailRegistration={registration()}
      />
    );

    const combobox = screen.getByRole('combobox', { name: 'Country selector' });
    expect(combobox).toHaveAttribute('aria-expanded', 'false');

    // The library only wires an onClick onto the flag button itself — this
    // clicks the wrapping div's own padding (label's next sibling per
    // contact-tabs.component.tsx's JSX), which forwardClickToCountrySelector
    // then forwards to that button, opening the dropdown.
    const clickForwardingDiv = container.querySelector(
      'label[for="phone"]'
    )!.nextElementSibling as HTMLElement;
    fireEvent.click(clickForwardingDiv);

    expect(combobox).toHaveAttribute('aria-expanded', 'true');
  });

  it('leaves a click on the country-selector button itself alone (already handled by the library)', () => {
    render(
      <ContactTabsComponent
        active="phone"
        onActiveChange={vi.fn()}
        phoneValue=""
        onPhoneChange={vi.fn()}
        emailRegistration={registration()}
      />
    );

    const combobox = screen.getByRole('combobox', { name: 'Country selector' });
    fireEvent.click(combobox);

    expect(combobox).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders the email field and its error message when active is "email"', () => {
    render(
      <ContactTabsComponent
        active="email"
        onActiveChange={vi.fn()}
        phoneValue=""
        onPhoneChange={vi.fn()}
        emailRegistration={registration()}
        emailError="Please enter valid email"
      />
    );

    expect(screen.getByPlaceholderText('Enter Email ID')).toBeInTheDocument();
    expect(screen.getByText('Please enter valid email')).toBeInTheDocument();
  });
});
