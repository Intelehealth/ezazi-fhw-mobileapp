import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LcgTableComponent } from '../../../components/elcg/lcg-table.component';
import type { ElcgView } from '../../../modules/dashboard/elcg/elcg.types';
import {
  buildElcgView,
  buildHour,
  entryValues,
  localIso,
  readingValues,
} from '../../fixtures/elcg-view';

function renderTable(view: ElcgView, props = {}) {
  return render(
    <LcgTableComponent
      title="WHO LABOUR CARE GUIDE VIEW"
      view={view}
      {...props}
    />
  );
}

/** The <tr> whose label cell reads `label`. */
function rowOf(label: string): HTMLElement {
  const row = screen.getByText(label).closest('tr');
  if (!row) throw new Error(`No row labelled ${label}`);
  return row;
}

describe('LcgTableComponent', () => {
  it('shows the title and patient header, with NA for anything not recorded', () => {
    renderTable(
      buildElcgView({
        patient: {
          ...buildElcgView().patient,
          hospitalId: 'HSP-2231',
          lmp: localIso(2026, 0, 26),
          membraneRuptured: { kind: 'status', value: 'Intact' },
        },
      })
    );

    expect(
      screen.getByRole('heading', { name: 'WHO LABOUR CARE GUIDE VIEW' })
    ).toBeInTheDocument();
    expect(screen.getByText('Name:').parentElement).toHaveTextContent(
      'Name: Asha Devi'
    );
    expect(screen.getByText('Hospital ID:').parentElement).toHaveTextContent(
      'HSP-2231'
    );
    expect(screen.getByText('Parity:').parentElement).toHaveTextContent('NA');
    expect(screen.getByText('LMP:').parentElement).toHaveTextContent(
      '2026/01/26'
    );
    expect(
      screen.getByText('Ruptured membranes:').parentElement
    ).toHaveTextContent('Intact');
  });

  it('shows the date and time of a recorded rupture of membranes', () => {
    renderTable(
      buildElcgView({
        patient: {
          ...buildElcgView().patient,
          membraneRuptured: {
            kind: 'date',
            value: localIso(2026, 10, 2, 4, 15),
          },
        },
      })
    );

    expect(
      screen.getByText('Ruptured membranes:').parentElement
    ).toHaveTextContent('[Date 2026/11/02 Time 04:15]');
  });

  it('heads each encounter column with its time, and flags SOS encounters', () => {
    const view = buildElcgView();
    view.stage1.columns[0] = {
      time: localIso(2026, 10, 2, 6, 0),
      isSos: false,
    };
    view.stage1.columns[1] = {
      time: localIso(2026, 10, 2, 6, 45),
      isSos: true,
    };
    renderTable(view);

    const timeRow = rowOf('Time');
    expect(timeRow).toHaveTextContent('2026/11/0206:00');
    const sosCell = within(timeRow).getByText('SOS').closest('td');
    expect(sosCell).toHaveTextContent('06:45');
    expect(sosCell?.className).toContain('bg-[#FFE9EF]');
  });

  it('spans each hour across its sub-columns, so an SOS-widened hour stays aligned', () => {
    const view = buildElcgView();
    view.stage1.hours[0] = buildHour({ subColumns: 3 });
    renderTable(view);

    const hourCells = within(rowOf('Hours')).getAllByRole('cell');
    expect(hourCells.find(cell => cell.textContent === '1')).toHaveAttribute(
      'colspan',
      '3'
    );
  });

  it('circles readings by their alert level', () => {
    renderTable(
      buildElcgView({
        readings: {
          ...buildElcgView().readings,
          pulse: readingValues({
            0: { value: '124', alert: 'R' },
            1: { value: '110', alert: 'Y' },
            2: { value: '96' },
          }),
        },
      })
    );

    const pulseRow = rowOf('Pulse');
    expect(within(pulseRow).getByText('124').className).toContain(
      'border-[#ED1A56]'
    );
    expect(within(pulseRow).getByText('110').className).toContain(
      'border-[#FD8C3E]'
    );
    expect(within(pulseRow).getByText('96').className).not.toContain(
      'border-2'
    );
  });

  it('plots cervix as X and descent as O on the row of their value', () => {
    renderTable(
      buildElcgView({
        readings: {
          ...buildElcgView().readings,
          cervix: readingValues({ 0: { value: '6' } }, { 0: { value: 'P' } }),
          descent: readingValues({ 0: { value: '3' } }),
        },
      })
    );

    const cervixSixRow = screen.getByText('≥5h').closest('tr') as HTMLElement;
    expect(within(cervixSixRow).getByText('X')).toBeInTheDocument();
    /* Second stage marks the start of pushing with P on the 10 cm row. */
    const cervixTenRow = rowOf('Cervix [Plot X]');
    expect(within(cervixTenRow).getByText('P')).toBeInTheDocument();

    const descentRows = screen
      .getAllByText('3')
      .map(cell => cell.closest('tr') as HTMLElement)
      .filter(row => within(row).queryByText('O'));
    expect(descentRows).toHaveLength(1);
  });

  it('writes medication administered into its sub-column', () => {
    renderTable(
      buildElcgView({
        medication: {
          oxytocin: entryValues({
            1: [
              {
                uuid: 'oxy-1',
                value: {
                  strength: '5',
                  infusionRate: '10',
                  infusionStatus: 'start',
                },
                initial: 'Dr. Joshi',
                obsDatetime: localIso(2026, 10, 2, 8, 5),
              },
            ],
          }),
          medicine: entryValues({
            0: [
              {
                uuid: 'med-1',
                value: 'Tablet | Paracetamol | 1::tablet',
                initial: 'Dr. Joshi',
                obsDatetime: localIso(2026, 10, 2, 7, 5),
              },
            ],
          }),
          ivFluids: entryValues(
            {},
            { 0: [{ uuid: 'iv-1', value: 'NO', initial: '', obsDatetime: '' }] }
          ),
        },
      })
    );

    expect(rowOf('Oxytocin (U/L, drops/min)')).toHaveTextContent(
      'Strength : 5 U/LInfusion Rate : 10 drops/minuteInfusion Status : start(Dr. Joshi 08:05)'
    );
    expect(rowOf('Medicine')).toHaveTextContent(
      'Tablet | Paracetamol | 1 tablet (Dr. Joshi 07:05)'
    );
    expect(within(rowOf('IV fluids')).getByText('NO')).toBeInTheDocument();
  });

  it("lists an hour's assessments and opens them in full", async () => {
    const onViewAssessment = vi.fn();
    const view = buildElcgView();
    view.stage1.hours[1] = buildHour({
      hasEncounter: true,
      initials: 'Kavita Rao',
      assessments: [
        {
          uuid: 'a-1',
          value: 'Progressing normally',
          initial: 'Dr. Joshi',
          obsDatetime: localIso(2026, 10, 2, 7, 10),
        },
      ],
    });
    renderTable(view, { onViewAssessment });

    expect(rowOf('ASSESSMENT')).toHaveTextContent(
      'Progressing normally (Dr. Joshi 07:10)'
    );
    expect(rowOf('INITIALS')).toHaveTextContent('Kavita Rao');
    /* Hours without an encounter have nothing to open. */
    expect(screen.getAllByRole('button', { name: /assessment$/ })).toHaveLength(
      1
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'View stage 1 hour 2 assessment' })
    );
    expect(onViewAssessment).toHaveBeenCalledWith(1, 1);
  });

  it('writes the birth outcome down the second stage once the visit is complete', () => {
    renderTable(
      buildElcgView({
        completion: {
          reason: {
            kind: 'newborn',
            birthOutcome: 'Live Birth',
            birthOutcomeOther: null,
            motherDeceasedReason: null,
          },
          birth: null,
          hasStage3: false,
        },
      })
    );

    expect(screen.getByText('LIVE BIRTH')).toBeInTheDocument();
    expect(screen.getByText('Mother Status: Healthy')).toBeInTheDocument();
  });

  it('explains an out-of-time completion on hover', () => {
    renderTable(
      buildElcgView({
        completion: {
          reason: { kind: 'out-of-time', reason: 'Shift ended' },
          birth: null,
          hasStage3: false,
        },
      })
    );

    expect(screen.getByText('OUT OF TIME')).toBeInTheDocument();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Shift ended');
  });

  it('leaves the outcome to the Stage 3 view when one was recorded', () => {
    renderTable(
      buildElcgView({
        completion: {
          reason: { kind: 'referred', referType: 'Referred to higher centre' },
          birth: null,
          hasStage3: true,
        },
      })
    );

    expect(
      screen.queryByText('Referred to higher centre')
    ).not.toBeInTheDocument();
  });
});
