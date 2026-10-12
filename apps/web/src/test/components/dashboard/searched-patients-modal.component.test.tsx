import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchedPatientsModalComponent } from '../../../components/dashboard/searched-patients-modal.component';
import type { OpenMrsPatientSearchResult } from '../../../types/patient.types';

const mutate = vi.hoisted(() => vi.fn());
const openVisit = vi.hoisted(() => ({ mutate, isPending: false }));
const onOpenedCapture = vi.hoisted(() => ({
  current: undefined as undefined | (() => void),
}));

vi.mock('../../../hooks/mutations/useOpenPatientVisit', () => ({
  useOpenPatientVisit: (onOpened: () => void) => {
    onOpenedCapture.current = onOpened;
    return openVisit;
  },
}));

const PATIENTS: OpenMrsPatientSearchResult[] = [
  {
    uuid: 'pat-1',
    identifiers: [
      { identifierType: { name: 'OpenMRS ID' }, identifier: '1000EWA' },
      { identifierType: { name: 'Other' }, identifier: 'ignored' },
    ],
    person: { display: 'Asha Rai', gender: 'F', age: 28 },
  },
  {
    uuid: 'pat-2',
    identifiers: [
      { identifierType: { name: 'OpenMRS ID' }, identifier: '1001EWA' },
    ],
    person: { display: 'Sita Devi', gender: 'F', age: 31 },
  },
];

beforeEach(() => {
  mutate.mockReset();
  openVisit.isPending = false;
});

describe('SearchedPatientsModalComponent', () => {
  it('lists each patient with its first identifier and "name (gender, age)"', () => {
    render(
      <SearchedPatientsModalComponent patients={PATIENTS} onClose={vi.fn()} />
    );

    expect(
      screen.getByRole('dialog', { name: 'Patients' })
    ).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('OpenMRS ID')).toBeInTheDocument();
    expect(within(rows[0]).getByText('1000EWA')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Asha Rai (F, 28)')).toBeInTheDocument();
    expect(screen.queryByText('ignored')).not.toBeInTheDocument();
    expect(within(rows[1]).getByText('Sita Devi (F, 31)')).toBeInTheDocument();
  });

  it('says "No patients found!" when there are no matches', () => {
    render(<SearchedPatientsModalComponent patients={[]} onClose={vi.fn()} />);

    expect(screen.getByText('No patients found!')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'View' })
    ).not.toBeInTheDocument();
  });

  it('opens the visit of the patient whose View button is clicked', () => {
    render(
      <SearchedPatientsModalComponent patients={PATIENTS} onClose={vi.fn()} />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[1]);

    expect(mutate).toHaveBeenCalledWith('pat-2');
  });

  it('closes the dialog once a visit has been opened', () => {
    const onClose = vi.fn();
    render(
      <SearchedPatientsModalComponent patients={PATIENTS} onClose={onClose} />
    );

    onOpenedCapture.current?.();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables the View buttons while a visit is being looked up', () => {
    openVisit.isPending = true;
    render(
      <SearchedPatientsModalComponent patients={PATIENTS} onClose={vi.fn()} />
    );

    screen.getAllByRole('button', { name: 'View' }).forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('closes from the Close button, on Escape and on a backdrop click — but not on other keys or clicks inside', () => {
    const onClose = vi.fn();
    const { container } = render(
      <SearchedPatientsModalComponent patients={PATIENTS} onClose={onClose} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(document, { key: 'a' });
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.mouseDown(container.firstElementChild as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('stops listening for Escape once it unmounts', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <SearchedPatientsModalComponent patients={PATIENTS} onClose={onClose} />
    );

    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });
});
