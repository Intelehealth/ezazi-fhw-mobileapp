import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CaseSectionComponent } from '../../../components/dashboard/case-section.component';
import type { VisitRow } from '../../../modules/dashboard/dashboard.types';

const ROWS: VisitRow[] = [
  {
    uuid: 'visit-1',
    patient: {
      name: 'Asha Devi',
      identifier: 'ELCG-1042',
      gender: 'F',
      age: 27,
    },
    stage: 2,
    alertCount: 3,
    cervixPlotX: '6 cm',
    descentPlotO: '2',
    alarmingReadings: [],
    provider: 'Nurse Kavita Rao',
    isUnseen: true,
    inLabourDuration: '3h 20m',
  },
  {
    uuid: 'visit-2',
    patient: {
      name: 'Meena Kumari',
      identifier: 'ELCG-1038',
      gender: 'F',
      age: 32,
    },
    stage: 3,
    alertCount: 1,
    cervixPlotX: '10 cm',
    descentPlotO: '4',
    alarmingReadings: [],
    provider: 'Dr. Sameer Joshi',
    isUnseen: false,
    inLabourDuration: '6h 05m',
  },
];

function renderSection(
  overrides: Partial<React.ComponentProps<typeof CaseSectionComponent>> = {}
) {
  const onToggle = vi.fn();
  const utils = render(
    <CaseSectionComponent
      icon={<span />}
      title="Priority cases"
      helpText="In-progress high priority cases"
      count={ROWS.length}
      rows={ROWS}
      variant="active"
      emptyMessage="No any priority cases."
      searchPlaceholder="Search priority cases"
      isExpanded
      onToggle={onToggle}
      {...overrides}
    />
  );
  return { ...utils, onToggle };
}

describe('CaseSectionComponent', () => {
  it('renders the title with count and both rows when expanded', () => {
    renderSection();

    expect(screen.getByText('Priority cases (2)')).toBeInTheDocument();
    expect(screen.getByText('ELCG-1042')).toBeInTheDocument();
    expect(screen.getByText('ELCG-1038')).toBeInTheDocument();
  });

  it('hides the table and search box when collapsed', () => {
    renderSection({ isExpanded: false });

    expect(screen.queryByText('ELCG-1042')).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Search priority cases')
    ).not.toBeInTheDocument();
  });

  it('calls onToggle when the header is clicked', () => {
    const { onToggle } = renderSection();

    fireEvent.click(screen.getByText('Priority cases (2)'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('filters rows by patient identifier as the user types', () => {
    renderSection();

    fireEvent.change(screen.getByPlaceholderText('Search priority cases'), {
      target: { value: '1038' },
    });

    expect(screen.queryByText('ELCG-1042')).not.toBeInTheDocument();
    expect(screen.getByText('ELCG-1038')).toBeInTheDocument();
  });

  it('filters rows by patient name and clears back to all rows on reset', () => {
    renderSection();
    const searchInput = screen.getByPlaceholderText('Search priority cases');

    fireEvent.change(searchInput, { target: { value: 'meena' } });
    expect(screen.queryByText('ELCG-1042')).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Reset priority cases search' })
    );
    expect(screen.getByText('ELCG-1042')).toBeInTheDocument();
    expect(screen.getByText('ELCG-1038')).toBeInTheDocument();
  });
});
