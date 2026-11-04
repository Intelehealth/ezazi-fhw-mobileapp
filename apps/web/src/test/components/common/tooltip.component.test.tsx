import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TooltipComponent } from '../../../components/common/tooltip.component';

describe('TooltipComponent', () => {
  it('pairs its children with a tooltip bubble', () => {
    render(
      <TooltipComponent label="Print" position="right">
        <button type="button">P</button>
      </TooltipComponent>
    );

    const tooltip = screen.getByRole('tooltip', { name: 'Print' });
    expect(tooltip.className).toContain('left-full');
    expect(tooltip.parentElement).toContainElement(
      screen.getByRole('button', { name: 'P' })
    );
  });

  it('renders the children alone for an empty label', () => {
    render(
      <TooltipComponent label="">
        <button type="button">P</button>
      </TooltipComponent>
    );

    expect(screen.getByRole('button', { name: 'P' })).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
