import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordStrengthMeterComponent } from '../../../components/auth/password-strength-meter.component';

describe('PasswordStrengthMeterComponent', () => {
  it.each([
    [1, 'Low'],
    [2, 'Fair'],
    [3, 'Good'],
    [4, 'Excellent'],
  ] as const)('shows the %s -> %s label', (level, label) => {
    render(<PasswordStrengthMeterComponent level={level} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('fills exactly `level` of the 4 segments', () => {
    const { container } = render(<PasswordStrengthMeterComponent level={2} />);
    const segments = container.querySelectorAll('.h-1.flex-1');
    expect(segments).toHaveLength(4);
    expect(segments[0].className).toContain('bg-[#2E1E91]');
    expect(segments[1].className).toContain('bg-[#2E1E91]');
    expect(segments[2].className).toContain('bg-[#B0ADBE]');
    expect(segments[3].className).toContain('bg-[#B0ADBE]');
  });
});
