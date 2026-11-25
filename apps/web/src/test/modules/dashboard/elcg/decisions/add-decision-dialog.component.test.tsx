import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AddDecisionDialogComponent } from '../../../../../modules/dashboard/elcg/decisions/add-decision-dialog.component';
import type {
  LcgDecisionEditor,
  LcgDecisionKind,
} from '../../../../../modules/dashboard/elcg/elcg.types';
import { buildDecisionEditor, localIso } from '../../../../fixtures/elcg-view';

const ME = 'doctor-1';
const SIGNED = {
  initial: 'Dr. Joshi',
  obsDatetime: localIso(2026, 10, 2, 19, 5),
};

function renderDialog(
  kind: LcgDecisionKind,
  decisions: LcgDecisionEditor = buildDecisionEditor()
) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <AddDecisionDialogComponent
      kind={kind}
      decisions={decisions}
      viewerUuid={ME}
      isSaving={false}
      onSave={onSave}
      onClose={onClose}
    />
  );
  return { onSave, onClose };
}

const save = () =>
  userEvent.click(screen.getByRole('button', { name: 'Save' }));

/** The validation messages shown — some read like their field's placeholder. */
const errors = () =>
  screen.queryAllByRole('alert').map(alert => alert.textContent);

describe('Assessment / Plan dialog', () => {
  it('opens on one empty line and requires it before saving', async () => {
    const { onSave } = renderDialog('assessment');

    expect(
      screen.getByRole('dialog', { name: 'ASSESSMENT' })
    ).toBeInTheDocument();
    await save();

    expect(errors()).toEqual(['Enter assessment']);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves every line added as a new obs', async () => {
    const { onSave } = renderDialog('plan');

    await userEvent.type(screen.getByPlaceholderText('Enter plan'), 'Rest');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await userEvent.type(
      screen.getAllByPlaceholderText('Enter plan')[1],
      'Encourage oral fluids'
    );
    await save();

    expect(onSave).toHaveBeenCalledWith([
      { action: 'create', value: 'Rest' },
      { action: 'create', value: 'Encourage oral fluids' },
    ]);
  });

  it("opens the signed-in user's own entries on the latest encounter for editing, and voids one removed", async () => {
    const { onSave } = renderDialog(
      'assessment',
      buildDecisionEditor({
        assessment: {
          history: [
            { uuid: 'a-1', value: 'Mine', ...SIGNED },
            { uuid: 'a-2', value: 'A colleague’s', ...SIGNED },
          ],
          current: [
            { uuid: 'a-1', value: 'Mine', creatorUuid: ME, ...SIGNED },
            {
              uuid: 'a-2',
              value: 'A colleague’s',
              creatorUuid: 'someone-else',
              ...SIGNED,
            },
          ],
        },
      })
    );

    const inputs = screen.getAllByPlaceholderText('Enter assessment');
    expect(inputs.map(input => (input as HTMLInputElement).value)).toEqual([
      'Mine',
    ]);
    /* Both are listed with when they were recorded. */
    expect(screen.getAllByText('(02-11-2026 07:05 PM)')).toHaveLength(2);

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove assessment' })
    );
    expect(screen.queryByPlaceholderText('Enter assessment')).toBeNull();
    await save();

    expect(onSave).toHaveBeenCalledWith([{ action: 'delete', uuid: 'a-1' }]);
  });

  it('closes on Cancel without saving', async () => {
    const { onSave, onClose } = renderDialog('assessment');

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('Medication dialog', () => {
  it('fills a listed medicine in from the list, and saves the prescription', async () => {
    const { onSave } = renderDialog('medication');

    await userEvent.type(screen.getByLabelText('Medicine *'), 'parac');
    await userEvent.click(
      screen.getByRole('option', { name: 'Tablet Paracetamol 650 mg' })
    );

    expect(screen.getByLabelText('Medicine *')).toHaveValue('Paracetamol');
    expect(screen.getByLabelText('Form *')).toHaveValue('Tablet');
    expect(screen.getByLabelText('Strength *')).toHaveValue('650 mg');
    expect(screen.getByLabelText('Dosage Unit *')).toHaveValue('Tab');
    expect(screen.getByLabelText('Route of Medicine *')).toHaveValue('Oral');

    await userEvent.type(screen.getByLabelText('Dosage *'), '1');
    await userEvent.selectOptions(
      screen.getByLabelText('Frequency *'),
      'Thrice daily (TID)'
    );
    await userEvent.type(screen.getByLabelText('Duration *'), '3');
    await userEvent.selectOptions(
      screen.getByLabelText('Duration Unit *'),
      'Days'
    );
    await save();

    expect(onSave).toHaveBeenCalledWith([
      {
        action: 'create',
        value:
          'Tablet | Paracetamol | 650 mg | 1::Tab | Thrice daily (TID) | Oral | 3::Days',
      },
    ]);
  });

  it('keeps a medicine typed in that is not on the list', async () => {
    renderDialog('medication');

    await userEvent.type(screen.getByLabelText('Medicine *'), 'Folic acid');
    await userEvent.keyboard('{Escape}');

    expect(screen.getByLabelText('Medicine *')).toHaveValue('Folic acid');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('asks for every required detail', async () => {
    const { onSave } = renderDialog('medication');

    await save();

    expect(errors()).toEqual([
      'Enter medicine name',
      'Enter type',
      'Enter strength',
      'Enter dosage',
      'Enter dosage unit',
      'Select frequency',
      'Select route',
      'Enter duration',
      'Select duration unit',
    ]);
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('Oxytocin dialog', () => {
  it('holds the strength to 1–10 U/L and the rate to 5–60 drops/minute', async () => {
    const { onSave } = renderDialog('oxytocin');

    expect(
      screen.queryByRole('button', { name: 'Prescribe New' })
    ).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Strength (U/L)*'), '12');
    await userEvent.type(
      screen.getByLabelText('Infusion Rate (drops/minute)*'),
      '4'
    );
    await save();

    expect(errors()).toEqual([
      'Strength should be between 1 to 10',
      'Infusion rate should be between 5 to 60',
      'Select infusion status',
    ]);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves the order and lists earlier ones', async () => {
    const { onSave } = renderDialog(
      'oxytocin',
      buildDecisionEditor({
        oxytocin: {
          history: [
            {
              uuid: 'o-1',
              value: {
                strength: '2',
                infusionRate: '10',
                infusionStatus: 'Start',
              },
              ...SIGNED,
            },
          ],
          current: [],
        },
      })
    );

    expect(
      screen.getByText('START OXYTOCIN - 2 U/L (10 drops/minute)')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Dr. Joshi (02-11-2026 07:05 PM)')
    ).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Strength (U/L)*'), '5');
    await userEvent.type(
      screen.getByLabelText('Infusion Rate (drops/minute)*'),
      '20'
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Infusion Status*'),
      'Continue'
    );
    await save();

    expect(onSave).toHaveBeenCalledWith([
      {
        action: 'create',
        value: '{"strength":5,"infusionRate":20,"infusionStatus":"Continue"}',
      },
    ]);
  });
});

describe('IV fluids dialog', () => {
  it('asks for the fluid by name when its type is "Other"', async () => {
    const { onSave } = renderDialog('ivFluids');

    expect(screen.queryByLabelText('Other IV Type*')).toBeNull();
    await userEvent.selectOptions(
      screen.getByLabelText('Type of IV Fluid*'),
      'Other'
    );
    await userEvent.type(
      screen.getByLabelText('IV Infusion Rate (drops/minute)*'),
      '30'
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Infusion Status*'),
      'Start'
    );
    await save();

    expect(errors()).toEqual(['Enter other type']);
    expect(onSave).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Other IV Type*'), 'Mannitol');
    await save();

    expect(onSave).toHaveBeenCalledWith([
      {
        action: 'create',
        value:
          '{"type":"Other","otherType":"Mannitol","infusionRate":30,"infusionStatus":"Start"}',
      },
    ]);
  });

  it('prescribes another fluid with "Prescribe New", and drops a new one removed', async () => {
    renderDialog('ivFluids');

    await userEvent.click(
      screen.getByRole('button', { name: 'Prescribe New' })
    );
    expect(screen.getAllByLabelText('Type of IV Fluid*')).toHaveLength(2);

    const removeButtons = screen.getAllByRole('button', {
      name: 'Remove IV fluid',
    });
    await userEvent.click(removeButtons[1]);

    expect(screen.getAllByLabelText('Type of IV Fluid*')).toHaveLength(1);
    expect(
      within(screen.getByRole('dialog')).getByText('IV FLUIDS')
    ).toBeInTheDocument();
  });
});
