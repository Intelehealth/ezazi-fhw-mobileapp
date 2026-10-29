import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatChipComponent } from '../../../components/dashboard/stat-chip.component';

describe('StatChipComponent', () => {
  it('renders the count and label passed in', () => {
    render(
      <StatChipComponent
        tone="red"
        count={3}
        label="Priority cases"
        icon={<span />}
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Priority cases')).toBeInTheDocument();
  });

  it.each([
    ['red', 'bg-[#FFE8E8]'],
    ['blue', 'bg-[#EFE8FF]'],
    ['outline', 'bg-[#c9beff]'],
  ] as const)('applies the %s tone background', (tone, expectedClass) => {
    render(
      <StatChipComponent tone={tone} count={1} label="label" icon={<span />} />
    );

    expect(
      screen.getByText('1').closest('div.p-4')?.parentElement?.className
    ).toContain(expectedClass);
  });

  it('renders a dash instead of 0 when the count is unknown', () => {
    render(
      <StatChipComponent
        tone="red"
        count={null}
        label="Priority cases"
        icon={<span />}
      />
    );

    expect(screen.getByText('–')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
