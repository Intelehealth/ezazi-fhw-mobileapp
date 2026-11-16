import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AlertCountBadgeComponent } from '../../../components/dashboard/alert-count-badge.component';

describe('AlertCountBadgeComponent', () => {
  it('shows a red triangle when there is at least one alert', () => {
    render(<AlertCountBadgeComponent count={2} />);
    const badge = screen.getByText('2');

    expect(badge.className).toContain('text-[#ED1A56]');
  });

  it('shows a green circle when there are no alerts', () => {
    render(<AlertCountBadgeComponent count={0} />);
    const badge = screen.getByText('0');

    expect(badge.className).toContain('text-[#019283]');
  });
});
