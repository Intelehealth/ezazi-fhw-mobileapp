import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TabSwitcherComponent } from '../../../components/auth/tab-switcher.component';

const TABS = [
  { id: 'phone', label: 'Mobile number' },
  { id: 'email', label: 'Email ID' },
];

describe('TabSwitcherComponent', () => {
  it('highlights the active tab and calls onChange with the clicked tab id', () => {
    const onChange = vi.fn();
    render(<TabSwitcherComponent tabs={TABS} active="phone" onChange={onChange} />);

    const phoneTab = screen.getByRole('button', { name: 'Mobile number' });
    const emailTab = screen.getByRole('button', { name: 'Email ID' });
    expect(phoneTab.className).toContain('bg-white');
    expect(emailTab.className).not.toContain('bg-white');

    fireEvent.click(emailTab);
    expect(onChange).toHaveBeenCalledWith('email');
  });
});
