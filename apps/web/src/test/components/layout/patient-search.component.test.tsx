import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientSearchComponent } from '../../../components/layout/patient-search.component';
import { showToast } from '../../../services/toast';
import type { OpenMrsPatientSearchResult } from '../../../types/patient.types';

const mutate = vi.hoisted(() => vi.fn());
const search = vi.hoisted(() => ({ mutate, isPending: false }));

vi.mock('../../../hooks/mutations/useSearchPatients', () => ({
  useSearchPatients: () => search,
}));

vi.mock('../../../services/toast', () => ({ showToast: vi.fn() }));

vi.mock(
  '../../../components/dashboard/searched-patients-modal.component',
  () => ({
    SearchedPatientsModalComponent: ({
      patients,
      onClose,
    }: {
      patients: unknown[];
      onClose: () => void;
    }) => (
      <div role="dialog">
        {patients.length} matches
        <button type="button" onClick={onClose}>
          close modal
        </button>
      </div>
    ),
  })
);

const MATCHES: OpenMrsPatientSearchResult[] = [
  {
    uuid: 'pat-1',
    identifiers: [
      { identifierType: { name: 'OpenMRS ID' }, identifier: '1000EWA' },
    ],
    person: { display: 'Asha Rai', gender: 'F', age: 28 },
  },
];

function resolveSearchWith(patients: OpenMrsPatientSearchResult[]) {
  mutate.mockImplementation(
    (
      _keyword: string,
      options: { onSuccess: (data: OpenMrsPatientSearchResult[]) => void }
    ) => options.onSuccess(patients)
  );
}

const box = () => screen.getByPlaceholderText('Search by patient name or ID');

beforeEach(() => {
  mutate.mockReset();
  search.isPending = false;
  vi.mocked(showToast).mockReset();
});

describe('PatientSearchComponent', () => {
  it('warns instead of searching when fewer than 3 characters are typed', () => {
    render(<PatientSearchComponent />);

    fireEvent.change(box(), { target: { value: 'as' } });
    fireEvent.keyUp(box(), { key: 'Enter' });

    expect(showToast).toHaveBeenCalledWith(
      'Warning',
      'Please enter minimum 3 characters to search patient....',
      'warning'
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it('warns when the box is empty and the magnifier is clicked', () => {
    render(<PatientSearchComponent />);

    fireEvent.click(screen.getByRole('button', { name: 'Search patients' }));

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(mutate).not.toHaveBeenCalled();
  });

  it('searches on Enter, opens the results dialog and clears the box', async () => {
    resolveSearchWith(MATCHES);
    render(<PatientSearchComponent />);

    fireEvent.change(box(), { target: { value: 'Asha' } });
    fireEvent.keyUp(box(), { key: 'Enter' });

    expect(mutate).toHaveBeenCalledWith('Asha', expect.any(Object));
    expect(await screen.findByRole('dialog')).toHaveTextContent('1 matches');
    expect(box()).toHaveValue('');
    expect(showToast).not.toHaveBeenCalled();
  });

  it('searches when the magnifier is clicked', () => {
    resolveSearchWith(MATCHES);
    render(<PatientSearchComponent />);

    fireEvent.change(box(), { target: { value: 'Asha' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search patients' }));

    expect(mutate).toHaveBeenCalledWith('Asha', expect.any(Object));
  });

  it('ignores keys other than Enter', () => {
    render(<PatientSearchComponent />);

    fireEvent.change(box(), { target: { value: 'Asha' } });
    fireEvent.keyUp(box(), { key: 'a' });

    expect(mutate).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('opens the dialog even when nothing matched, and closes it again', async () => {
    resolveSearchWith([]);
    render(<PatientSearchComponent />);

    fireEvent.change(box(), { target: { value: 'zzz' } });
    fireEvent.keyUp(box(), { key: 'Enter' });
    expect(await screen.findByRole('dialog')).toHaveTextContent('0 matches');

    fireEvent.click(screen.getByRole('button', { name: 'close modal' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });

  it('keeps the typed text and shows no dialog when the search fails', () => {
    mutate.mockImplementation(() => undefined);
    render(<PatientSearchComponent />);

    fireEvent.change(box(), { target: { value: 'Asha' } });
    fireEvent.keyUp(box(), { key: 'Enter' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(box()).toHaveValue('Asha');
  });

  it('disables the magnifier while a search is running', () => {
    search.isPending = true;
    render(<PatientSearchComponent />);

    expect(
      screen.getByRole('button', { name: 'Search patients' })
    ).toBeDisabled();
  });
});
