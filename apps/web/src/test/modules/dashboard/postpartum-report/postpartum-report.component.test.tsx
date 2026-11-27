import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PostpartumReportComponent } from '../../../../modules/dashboard/postpartum-report/postpartum-report.component';

/* Signed in as a doctor — the author of whatever the dialogs save. */
vi.mock('../../../../store/hooks', () => ({
  useAppSelector: (select: (state: unknown) => unknown) =>
    select({
      auth: { user: { uuid: 'doctor-1', displayName: 'Dr. Meera Rao' } },
    }),
}));

function renderReport() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard/postpartum-report/visit-1']}>
        <Routes>
          <Route
            path="/dashboard/postpartum-report/:visitUuid"
            element={<PostpartumReportComponent visitUuid="visit-1" />}
          />
          <Route path="/dashboard/elcg/:visitUuid" element={<p>eLCG page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/* The `index`-th monitoring-grid row headed `label` (maternal rows come first). */
function gridRow(label: string, index = 0) {
  const headers = screen.getAllByRole('rowheader', { name: label });
  return headers[index].closest('tr')!;
}

/* A decision panel's header (its toggle), by column and title. */
function panelHeader(patient: 'mother' | 'newborn', title: string) {
  const column = screen.getByRole('heading', {
    name: patient === 'mother' ? 'Mother' : 'Newborn',
  }).parentElement!;
  return within(column)
    .getAllByRole('button', { expanded: false })
    .concat(within(column).queryAllByRole('button', { expanded: true }))
    .find(header =>
      header.querySelector('h6')?.textContent?.startsWith(title)
    )!;
}

function panelOf(patient: 'mother' | 'newborn', title: string) {
  return panelHeader(patient, title).parentElement!;
}

describe('PostpartumReportComponent (mock data)', () => {
  it('summarises the delivery outcome', () => {
    renderReport();

    expect(screen.getByText('DELIVERY OUTCOME REPORT')).toBeInTheDocument();
    expect(screen.getByText('Name:').closest('td')).toHaveTextContent(
      'Priya Devi'
    );
    expect(screen.getByText('Delivery Date:').closest('td')).toHaveTextContent(
      '2026 November 26'
    );
    expect(screen.getByText('APGAR Score:').closest('td')).toHaveTextContent(
      '8/9'
    );
    expect(
      screen.getByText('AMTSL Medication:').closest('td')
    ).toHaveTextContent('Oxytocin 10 IU IM');
    /* No congenital disorders recorded: gestation takes the whole row. */
    expect(screen.queryByText('Congenital Disorders:')).not.toBeInTheDocument();
  });

  it('lays out the monitoring checks, with the SOS reading among them', () => {
    renderReport();

    const [maternalHeader] = screen
      .getAllByRole('columnheader', { name: /Maternal Vitals/ })
      .map(cell => cell.closest('tr')!);
    const labels = within(maternalHeader)
      .getAllByRole('columnheader')
      .slice(1)
      .map(cell => cell.querySelector('div')?.textContent);
    /* Each recorded check shows its date and 24-hour time (formatColTime()). */
    expect(
      within(maternalHeader).getAllByRole('columnheader')[1]
    ).toHaveTextContent(/0 min\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
    expect(labels).toEqual([
      '0 min',
      '+15m',
      '+30m',
      '+45m',
      'SOS',
      '+1h 15m',
      '+1h 45m',
      '+2h 45m',
      '+3h 45m',
    ]);
  });

  it('flags out-of-range readings', () => {
    renderReport();

    const pulse = within(gridRow('Pulse')).getAllByRole('cell');
    expect(within(pulse[0]).getByText('88')).not.toHaveAttribute('data-alert');
    expect(within(pulse[4]).getByText('124')).toHaveAttribute('data-alert');

    const bp = within(gridRow('BP')).getAllByRole('cell');
    expect(bp[0]).toHaveTextContent('Systolic: 118Diastolic: 76');
  });

  it("lists the mother's and the newborn's decisions, newest first", async () => {
    renderReport();

    await userEvent.click(panelHeader('mother', 'Assessment'));

    const items = within(panelOf('mother', 'Assessment')).getAllByRole(
      'listitem'
    );
    expect(items[0]).toHaveTextContent('Bleeding controlled');
    expect(items.at(-1)).toHaveTextContent('Uterus well contracted');
  });

  it("adds a mother's assessment on the latest encounter from its dialog", async () => {
    renderReport();

    await userEvent.click(
      screen.getByRole('button', { name: 'Add mother assessment' })
    );
    const dialog = screen.getByRole('dialog', { name: 'ASSESSMENT' });
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Assessment' }),
      'Fundus firm, lochia normal.'
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(panelHeader('mother', 'Assessment'));
    const [newest] = within(panelOf('mother', 'Assessment')).getAllByRole(
      'listitem'
    );
    expect(newest).toHaveTextContent('Fundus firm, lochia normal.');
    /* As stage3.component.html lists it: when, not who. */
    expect(newest).toHaveTextContent(
      /\(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2} [ap]m\)$/
    );
    expect(newest).not.toHaveTextContent('Dr. Meera Rao');

    /* Recorded in the +1h 45m column, the latest one with an encounter. */
    const cells = within(gridRow('Assessment (Mother)')).getAllByRole('cell');
    expect(cells[6]).toHaveTextContent('Fundus firm, lochia normal.');
    /* Not on the newborn's side. */
    expect(gridRow('Assessment (Newborn)')).not.toHaveTextContent('Fundus');
  });

  it('reopens your own entries on the latest encounter for editing', async () => {
    renderReport();
    const openPlan = () =>
      userEvent.click(screen.getByRole('button', { name: 'Add newborn plan' }));

    await openPlan();
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Plan' }),
      'Weigh baby'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await openPlan();
    const input = screen.getByRole('textbox', { name: 'Plan' });
    expect(input).toHaveValue('Weigh baby');
    await userEvent.clear(input);
    await userEvent.type(input, 'Weigh baby before discharge');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    const cells = within(gridRow('Plan (Newborn)')).getAllByRole('cell');
    expect(cells[6]).toHaveTextContent('Weigh baby before discharge');
    expect(cells[6].textContent?.match(/Weigh baby/g)).toHaveLength(1);
  });

  it('validates the dialog before saving', async () => {
    renderReport();

    await userEvent.click(
      screen.getByRole('button', { name: 'Add mother plan' })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('dialog', { name: 'PLAN' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter plan');
  });

  it('goes back to the guide', async () => {
    renderReport();

    await userEvent.click(screen.getByRole('button', { name: 'View eLCG' }));

    expect(screen.getByText('eLCG page')).toBeInTheDocument();
  });
});
