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

  it('falls back to the placeholder avatar when the patient image fails to load', () => {
    // alt="" gives the avatar an empty accessible name, which strips it out
    // of the "img" role entirely (treated as decorative) — queried by tag
    // instead of role for that reason.
    const { container } = render(
      <VisitTableComponent
        rows={[
          { ...ROW, patient: { ...ROW.patient, avatarUrl: 'broken.jpg' } },
        ]}
        variant="active"
        emptyMessage="empty"
      />
    );

    const avatar = container.querySelector('img') as HTMLImageElement;
    expect(avatar.src).toContain('broken.jpg');

    // user.svg is small enough that Vite inlines it as a data URI rather
    // than a "user.svg" path — asserting the src actually changed off the
    // broken one is what this test can portably check.
    fireEvent.error(avatar);
    expect(avatar.src).not.toContain('broken.jpg');
  });

  it('shows the reason tooltip when the completed row has an out-of-time reason', () => {
    render(
      <VisitTableComponent
        rows={[
          {
            ...ROW,
            completeReason: 'Out Of Time',
            outOfTimeReason: 'Labour exceeded protocol window',
          },
        ]}
        variant="completed"
        emptyMessage="empty"
      />
    );

    expect(screen.getByText('Out Of Time')).toBeInTheDocument();
    expect(
      screen.getByTitle('Labour exceeded protocol window')
    ).toBeInTheDocument();
  });

  it('shows the reason tooltip from referTypeOtherReason when there is no out-of-time reason', () => {
    render(
      <VisitTableComponent
        rows={[
          {
            ...ROW,
            completeReason: undefined,
            referTypeOtherReason: 'Referred for specialist care',
          },
        ]}
        variant="completed"
        emptyMessage="empty"
      />
    );

    expect(
      screen.getByTitle('Referred for specialist care')
    ).toBeInTheDocument();
  });

  it('falls back to "-" for in-labour duration, cervix and descent plots when unset', () => {
    render(
      <VisitTableComponent
        rows={[
          {
            ...ROW,
            inLabourDuration: undefined,
            cervixPlotX: null,
            descentPlotO: null,
          },
        ]}
        variant="active"
        emptyMessage="empty"
      />
    );

    expect(screen.getAllByText('-')).toHaveLength(3);
  });

  it('shows "-" for age when the patient has no known birthdate', () => {
    render(
      <VisitTableComponent
        rows={[{ ...ROW, patient: { ...ROW.patient, age: null } }]}
        variant="active"
        emptyMessage="empty"
      />
    );

    expect(screen.queryByText('nully')).not.toBeInTheDocument();
    expect(screen.queryByText('27y')).not.toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('stripes rows like Angular (1st, 3rd… grey) and highlights unseen visits', () => {
    const rows = ['a', 'b', 'c', 'd'].map((id, i) => ({
      ...ROW,
      uuid: id,
      patient: { ...ROW.patient, identifier: `ID-${id}` },
      isUnseen: i === 3,
    }));
    render(
      <VisitTableComponent rows={rows} variant="active" emptyMessage="empty" />
    );

    const rowClass = (id: string) =>
      screen.getByText(`ID-${id}`).closest('tr')?.className;
    expect(rowClass('a')).toContain('bg-[#F7F7FA]');
    expect(rowClass('b')).toContain('bg-white');
    expect(rowClass('c')).toContain('bg-[#F7F7FA]');
    expect(rowClass('d')).toContain('bg-[#E6FFF3]');
  });
});
