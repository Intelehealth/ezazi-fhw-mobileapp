import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServerError } from '@ezazi/api-client';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePostpartumReport } from '../../../../hooks/queries/usePostpartumReport';
import { PostpartumReportComponent } from '../../../../modules/dashboard/postpartum-report/postpartum-report.component';
import { buildMockPostpartumReport } from '../../../../modules/dashboard/postpartum-report/postpartum-report.mock';
import type { PostpartumReportView } from '../../../../modules/dashboard/postpartum-report/postpartum-report.types';
import { showToast } from '../../../../services/toast';

/*
 * The report's edge states, with the hook mocked — its own suite covers it,
 * and postpartum-report.component.test.tsx runs the screen on the real mock.
 */
vi.mock('../../../../hooks/queries/usePostpartumReport', () => ({
  usePostpartumReport: vi.fn(),
}));
vi.mock('../../../../services/toast', () => ({ showToast: vi.fn() }));

const auth = vi.hoisted(() => ({
  user: { uuid: 'doctor-1' } as { uuid: string } | null,
}));
vi.mock('../../../../store/hooks', () => ({
  useAppSelector: (select: (state: unknown) => unknown) => select({ auth }),
}));

const saveDecision = vi.fn();

function mockReport(report: PostpartumReportView | null) {
  vi.mocked(usePostpartumReport).mockReturnValue({
    report,
    saveDecision,
    isSavingDecision: false,
  });
}

/* The mock report with a mother's plan the viewer recorded on the latest encounter. */
function withOwnPlan(): PostpartumReportView {
  const report = buildMockPostpartumReport('visit-1');
  return {
    ...report,
    maternal: report.maternal.map(row =>
      row.kind === 'notes' && row.key === 'plan'
        ? {
            ...row,
            values: row.values.map((notes, index) =>
              index === 6
                ? [
                    {
                      uuid: 'obs-own',
                      value: 'Review in 30 min',
                      initial: 'Dr. Meera Rao',
                      obsDatetime: '2026-11-26T04:30:00.000Z',
                      creatorUuid: 'doctor-1',
                    },
                  ]
                : notes
            ),
          }
        : row
    ),
  };
}

function renderReport() {
  render(
    <MemoryRouter>
      <PostpartumReportComponent visitUuid="visit-1" />
    </MemoryRouter>
  );
}

const openMotherPlan = () =>
  userEvent.click(screen.getByRole('button', { name: 'Add mother plan' }));

beforeEach(() => {
  auth.user = { uuid: 'doctor-1' };
  saveDecision.mockReset();
  vi.mocked(showToast).mockReset();
});

describe('PostpartumReportComponent — edge states', () => {
  it('says so when there is no postpartum monitoring to report', () => {
    mockReport(null);
    renderReport();

    expect(screen.getByRole('status')).toHaveTextContent(
      'No postpartum monitoring has been recorded for this visit yet.'
    );
  });

  it('warns instead of opening a dialog while no encounter has been recorded', async () => {
    const report = buildMockPostpartumReport('visit-1');
    mockReport({
      ...report,
      columns: report.columns.map(column => ({
        ...column,
        encounterUuid: null,
      })),
    });
    renderReport();

    await openMotherPlan();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(showToast).toHaveBeenCalledWith(
      'No reading recorded yet',
      'No Stage 3 encounter found to save data.',
      'warning'
    );
  });

  it('records on the patient and the latest encounter', async () => {
    mockReport(buildMockPostpartumReport('visit-1'));
    renderReport();

    await openMotherPlan();
    await userEvent.type(screen.getByRole('textbox'), 'Monitor bleeding');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(saveDecision).toHaveBeenCalledWith(
      {
        target: { patient: 'mother', kind: 'plan' },
        patientUuid: 'mock-patient',
        encounterUuid: 'mock-enc-6',
        changes: [{ action: 'create', value: 'Monitor bleeding' }],
      },
      expect.anything()
    );
  });

  it('closes without saving when nothing changed', async () => {
    mockReport(withOwnPlan());
    renderReport();

    await openMotherPlan();
    expect(screen.getByRole('textbox')).toHaveValue('Review in 30 min');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(saveDecision).not.toHaveBeenCalled();
  });

  it('closes the dialog and says so when saving fails', async () => {
    saveDecision.mockImplementation((_input, { onError }) =>
      onError(new ServerError())
    );
    mockReport(buildMockPostpartumReport('visit-1'));
    renderReport();

    await openMotherPlan();
    await userEvent.type(screen.getByRole('textbox'), 'Monitor bleeding');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(showToast).toHaveBeenCalledWith(
      'Could not save',
      expect.any(String),
      'error'
    );
  });

  it('closes on Cancel', async () => {
    mockReport(buildMockPostpartumReport('visit-1'));
    renderReport();

    await openMotherPlan();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("leaves a history line's time blank when its date is unreadable", async () => {
    const report = withOwnPlan();
    mockReport({
      ...report,
      maternal: report.maternal.map(row =>
        row.kind === 'notes' && row.key === 'plan'
          ? {
              ...row,
              values: row.values.map(notes =>
                notes.map(note => ({ ...note, obsDatetime: 'not a date' }))
              ),
            }
          : row
      ),
    });
    renderReport();

    await userEvent.click(screen.getAllByText('Plan')[0]);

    expect(screen.getAllByText('()').length).toBeGreaterThan(0);
  });

  it('opens nothing as editable when no one is signed in', async () => {
    auth.user = null;
    mockReport(withOwnPlan());
    renderReport();

    await openMotherPlan();

    expect(screen.getByRole('textbox')).toHaveValue('');
  });
});
