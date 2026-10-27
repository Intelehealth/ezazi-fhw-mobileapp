import '@/core/i18n';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { getCardLayout, getStepperSpec } from '@ezazi/clinical-rules';

import { toTabViews } from '../../domain/captureFieldView';
import type { CaptureFormApi } from '../../domain/captureFormApi';
import { CaptureTabPage } from '../CaptureTabPage';

const TABS = toTabViews(getCardLayout('Stage1_Hour1_1')!, 'default');
const tab = (id: string) => TABS.find((candidate) => candidate.id === id)!;

const stubForm = (overrides: Partial<CaptureFormApi> = {}): CaptureFormApi => ({
  fieldValue: () => '',
  fieldAlert: () => false,
  fieldError: () => undefined,
  setValue: jest.fn(),
  infusionAnswer: () => ({ answer: 'no', entry: {} }),
  infusionErrors: () => ({}),
  setInfusionAnswer: jest.fn(),
  setInfusionInput: jest.fn(),
  infusionBounds: { strength: getStepperSpec('oxytocinStrength', 'default'), rate: getStepperSpec('infusionRate', 'default') },
  medicine: { answer: 'no', medicines: [] },
  setMedicineAnswer: jest.fn(),
  addMedicine: jest.fn(),
  updateMedicine: jest.fn(),
  removeMedicine: jest.fn(),
  fieldNotes: () => [],
  addNote: jest.fn(),
  removeNote: jest.fn(),
  summary: [],
  ...overrides,
});

describe('CaptureTabPage', () => {
  it('draws a tab\'s fields and passes changes to the form', () => {
    const form = stubForm();
    render(<CaptureTabPage tab={tab('supportiveCare')} form={form} />);

    fireEvent.press(screen.getAllByRole('radio', { name: 'No' })[0]);
    expect(form.setValue).toHaveBeenCalledWith('companion', 'N');
    expect(screen.getByText('POSTURE')).toBeTruthy();
  });

  it('shows the form\'s values, alerts and errors', () => {
    render(
      <CaptureTabPage
        tab={tab('woman')}
        form={stubForm({
          fieldValue: (id) => (id === 'pulse' ? '130' : ''),
          fieldError: (id) => (id === 'pulse' ? 'Please enter Pulse in between 30 and 250' : undefined),
        })}
      />,
    );
    expect(screen.getByLabelText('Pulse').props.value).toBe('130');
    expect(screen.getByText('Please enter Pulse in between 30 and 250')).toBeTruthy();
  });

  it('routes the Medication answers to the form', () => {
    const form = stubForm();
    render(<CaptureTabPage tab={tab('medication')} form={form} />);
    fireEvent.press(screen.getAllByRole('radio', { name: 'Yes' })[0]);
    expect(form.setInfusionAnswer).toHaveBeenCalledWith('oxytocin', 'yes');
    fireEvent.press(screen.getAllByRole('radio', { name: 'Yes' })[1]);
    expect(form.setMedicineAnswer).toHaveBeenCalledWith('yes');
  });

  it('opens Shared decision with the alert summary', () => {
    render(
      <CaptureTabPage
        tab={tab('sharedDecisionMaking')}
        form={stubForm({
          summary: [{ labelKey: 'partogram.section.baby', androidLabel: 'Baby', items: [{ labelKey: 'partogram.field.caput', androidLabel: 'Caput', value: '+++ (Marked)' }] }],
        })}
      />,
    );
    expect(screen.getByText('OBSERVATION SUMMARY')).toBeTruthy();
    expect(screen.getByText('ASSESSMENT')).toBeTruthy();
  });
});
