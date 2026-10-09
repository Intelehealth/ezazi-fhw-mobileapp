import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import rightArrow from '../../../assets/svgs/right-arrow.svg';
import rightArrowBlue from '../../../assets/svgs/right-arrow-blue.svg';
import { NextButtonComponent } from '../../../components/auth/next-button.component';

describe('NextButtonComponent', () => {
  it('renders filled/enabled with the right-arrow icon when valid', () => {
    const { container } = render(<NextButtonComponent isValid />);
    const button = screen.getByRole('button', { name: /next/i });
    expect(button).not.toBeDisabled();
    expect(button.className).toContain('bg-[#2E1E91]');
    expect(container.querySelector('img')?.getAttribute('src')).toBe(rightArrow);
  });

  it('renders outlined/disabled with the blue arrow icon when invalid', () => {
    const { container } = render(<NextButtonComponent isValid={false} />);
    const button = screen.getByRole('button', { name: /next/i });
    expect(button).toBeDisabled();
    expect(button.className).toContain('border-[#2E1E91]');
    expect(container.querySelector('img')?.getAttribute('src')).toBe(rightArrowBlue);
  });

  it('is disabled while loading even when valid', () => {
    render(<NextButtonComponent isValid isLoading />);
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('supports custom label text and omitting the icon (otp-verification\'s Verify button)', () => {
    render(
      <NextButtonComponent isValid showIcon={false}>
        Verify
      </NextButtonComponent>
    );
    expect(screen.getByRole('button', { name: 'Verify' })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
