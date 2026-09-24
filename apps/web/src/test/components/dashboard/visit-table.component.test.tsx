import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VisitTableComponent } from '../../../components/dashboard/visit-table.component';
import type { VisitRow } from '../../../modules/dashboard/dashboard.types';

const ROW: VisitRow = {
  uuid: 'visit-1',
  patient: { name: 'Asha Devi', identifier: 'ELCG-1042', gender: 'F', age: 27 },
  stage: 2,
  alertCount: 3,
  cervixPlotX: '6 cm',
  descentPlotO: '2',
  alarmingReadings: [{ key: 'Baseline FHR', value: 168 }],
  provider: 'Nurse Kavita Rao',
  isUnseen: true,
  inLabourDuration: '3h 20m',
};

describe('VisitTableComponent', () => {
  it('renders the empty message when there are no rows', () => {
    render(
      <VisitTableComponent
        rows={[]}
        variant="active"
        emptyMessage="No any priority cases."
      />
    );

    expect(screen.getByText('No any priority cases.')).toBeInTheDocument();
  });

  it('renders in-labour duration for the "active" variant, not date of birth', () => {
    render(
      <VisitTableComponent rows={[ROW]} variant="active" emptyMessage="empty" />
    );

    expect(screen.getByText('In-labour duration')).toBeInTheDocument();
    expect(screen.getByText('3h 20m')).toBeInTheDocument();
    expect(screen.queryByText('Birth Outcome')).not.toBeInTheDocument();
  });

  it('renders date of birth and the birth-outcome/reason columns for the "completed" variant', () => {
    render(
      <VisitTableComponent
        rows={[
          {
            ...ROW,
            inLabourDuration: undefined,
            dateTimeOfBirth: '2026/09/22 08:14 am',
            birthOutcome: 'Live birth',
            completeReason: 'Newborn',
          },
        ]}
        variant="completed"
        emptyMessage="empty"
      />
    );

    expect(screen.getByText('Date & Time of Birth')).toBeInTheDocument();
    expect(screen.getByText('2026/09/22 08:14 am')).toBeInTheDocument();
    expect(screen.getByText('Live birth')).toBeInTheDocument();
    expect(screen.getByText('Newborn')).toBeInTheDocument();
  });

  it('calls onRowClick with the clicked row', () => {
    const onRowClick = vi.fn();
    render(
      <VisitTableComponent
        rows={[ROW]}
        variant="active"
        emptyMessage="empty"
        onRowClick={onRowClick}
      />
    );

    fireEvent.click(screen.getByText('ELCG-1042'));
    expect(onRowClick).toHaveBeenCalledWith(ROW);
  });
});
