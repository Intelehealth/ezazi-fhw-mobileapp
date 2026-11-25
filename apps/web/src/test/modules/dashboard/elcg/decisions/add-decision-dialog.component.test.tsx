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
  decisions: LcgDecisionEditor = buildDecisionEditor(),
  isSaving = false
) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <AddDecisionDialogComponent
      kind={kind}
      decisions={decisions}
      viewerUuid={ME}
      isSaving={isSaving}
      onSave={onSave}
      onClose={onClose}
    />
  );
  return { onSave, onClose };
}

const save = () =>
  userEvent.click(screen.getByRole('button', { name: 'Save' }));

/** Opens a dropdown and picks one of its options. */
async function choose(label: string, option: string) {
  await userEvent.click(screen.getByLabelText(label));
  await userEvent.click(screen.getByRole('option', { name: option }));
}

/** The validation messages shown — some read like their field's placeholder. */
const errors = async () =>
  /* Validation runs asynchronously after Save; wait for its messages to render. */
  (await screen.findAllByRole('alert')).map(alert => alert.textContent);

describe('Assessment / Plan dialog', () => {
  it('opens on one empty line and requires it before saving', async () => {
    const { onSave } = renderDialog('assessment');

    expect(
      screen.getByRole('dialog', { name: 'ASSESSMENT' })
    ).toBeInTheDocument();
    await save();

    expect(await errors()).toEqual(['Enter assessment']);
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
    await choose('Frequency *', 'Thrice daily (TID)');
    await userEvent.type(screen.getByLabelText('Duration *'), '3');
    await choose('Duration Unit *', 'Days');
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

    expect(await errors()).toEqual([
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

    expect(await errors()).toEqual([
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
    await choose('Infusion Status*', 'Continue');
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
    await choose('Type of IV Fluid*', 'Other');
    await userEvent.type(
      screen.getByLabelText('IV Infusion Rate (drops/minute)*'),
      '30'
    );
    await choose('Infusion Status*', 'Start');
    await save();

    expect(await errors()).toEqual(['Enter other type']);
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

describe('while saving', () => {
  it('says so, and cannot be closed or saved again half-way through', async () => {
    const { onClose, onSave } = renderDialog(
      'plan',
      buildDecisionEditor(),
      true
    );

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('saved rows', () => {
  const ivEntry = {
    uuid: 'i-1',
    value: {
      type: 'Ringer Lactate',
      infusionRate: '20',
      infusionStatus: 'start',
    },
    ...SIGNED,
  };

  it('keeps a saved value from outside the list selectable', async () => {
    renderDialog(
      'ivFluids',
      buildDecisionEditor({
        ivFluids: {
          history: [ivEntry],
          current: [{ ...ivEntry, creatorUuid: ME }],
        },
      })
    );

    expect(screen.getByLabelText('Infusion Status*')).toHaveValue('start');
    await userEvent.click(screen.getByLabelText('Infusion Status*'));
    expect(
      screen.getAllByRole('option').map(option => option.textContent)
    ).toEqual(['start', 'Start', 'Continue', 'Stop']);
    /* And the order is listed below the form. */
    expect(
      screen.getByText('START IV - Ringer Lactate (20 drops/minute)')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Dr. Joshi (02-11-2026 07:05 PM)')
    ).toBeInTheDocument();
  });

  it('voids a saved IV fluid that is removed', async () => {
    const { onSave } = renderDialog(
      'ivFluids',
      buildDecisionEditor({
        ivFluids: { history: [], current: [{ ...ivEntry, creatorUuid: ME }] },
      })
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove IV fluid' })
    );
    expect(screen.queryByLabelText('Type of IV Fluid*')).toBeNull();
    await save();

    expect(onSave).toHaveBeenCalledWith([{ action: 'delete', uuid: 'i-1' }]);
  });

  it('checks each IV fluid on its own', async () => {
    const { onSave } = renderDialog(
      'ivFluids',
      buildDecisionEditor({
        ivFluids: {
          history: [],
          current: [
            {
              ...ivEntry,
              value: { ...ivEntry.value, infusionStatus: 'Start' },
              creatorUuid: ME,
            },
          ],
        },
      })
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Prescribe New' })
    );
    await save();

    /* Only the new, empty order is flagged. */
    expect(await errors()).toEqual([
      'Enter type',
      'Enter infusion rate',
      'Select infusion status',
    ]);
    expect(onSave).not.toHaveBeenCalled();
  });

  const medicine = {
    uuid: 'm-1',
    value:
      'Tablet | Paracetamol | 650 mg | 1::Tab | Thrice daily (TID) | Oral | 3::Days',
    ...SIGNED,
  };

  it('lists earlier prescriptions, and voids one removed', async () => {
    const { onSave } = renderDialog(
      'medication',
      buildDecisionEditor({
        medication: {
          history: [medicine],
          current: [{ ...medicine, creatorUuid: ME }],
        },
      })
    );

    expect(
      screen.getByText(
        'Tablet Paracetamol 650 mg 1 Tab Thrice daily (TID) Oral for 3 Days'
      )
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove medicine' })
    );
    await save();

    expect(onSave).toHaveBeenCalledWith([{ action: 'delete', uuid: 'm-1' }]);
  });

  it('takes a strength typed in or picked from the list', async () => {
    const { onSave } = renderDialog(
      'medication',
      buildDecisionEditor({
        medication: {
          history: [],
          current: [{ ...medicine, creatorUuid: ME }],
        },
      })
    );
    const strength = screen.getByLabelText('Strength *');

    await userEvent.clear(strength);
    await userEvent.type(strength, '325 mg');
    await save();
    expect(onSave).toHaveBeenLastCalledWith([
      {
        action: 'update',
        uuid: 'm-1',
        value: expect.stringContaining('| 325 mg |'),
      },
    ]);

    await userEvent.clear(strength);
    await userEvent.click(screen.getByRole('option', { name: '500 mg' }));
    await save();
    expect(onSave).toHaveBeenLastCalledWith([
      {
        action: 'update',
        uuid: 'm-1',
        value: expect.stringContaining('| 500 mg |'),
      },
    ]);
  });
});
