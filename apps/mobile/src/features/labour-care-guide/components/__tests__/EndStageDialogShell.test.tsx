import '@/core/i18n';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Modal } from 'react-native';
import { STAGE1_OUTCOME } from '@ezazi/clinical-rules';

import { EndStage1ChoiceDialog, MotherDeathDialog, ReferHospitalDialog } from '../EndStageDialogs';
import { LABOUR_TEST_IDS } from '../../testIds';

const IDS = LABOUR_TEST_IDS.endStage;

/** Every End Stage dialog closes on its ✕ and on the device Back button, as Cancel does (UI_CONVENTIONS §6). */
describe('End Stage dialogs: ✕ and Back', () => {
  it.each([
    ['End Stage 1', IDS.stage1Dialog, (onCancel: () => void) => <EndStage1ChoiceDialog visible onCancel={onCancel} onChoose={jest.fn()} />],
    ['Refer', IDS.referDialog, (onCancel: () => void) => <ReferHospitalDialog visible onCancel={onCancel} onDone={jest.fn()} />],
    ['Mother Death', IDS.motherDeathDialog, (onCancel: () => void) => <MotherDeathDialog visible onCancel={onCancel} onDone={jest.fn()} />],
  ])('%s closes on ✕ and on Back', (_name, id, dialog) => {
    const onCancel = jest.fn();
    render(dialog(onCancel));

    fireEvent.press(screen.getByTestId(`${id}-close`));
    screen.UNSAFE_getByType(Modal).props.onRequestClose();

    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('carries the QA locators of its parts', () => {
    render(<EndStage1ChoiceDialog visible onCancel={jest.fn()} onChoose={jest.fn()} />);

    expect(screen.getByTestId(IDS.stage1Dialog)).toBeTruthy();
    expect(screen.getByTestId(`${IDS.stage1Dialog}-cancel`)).toBeTruthy();
    expect(screen.getByTestId(`${IDS.stage1Dialog}-confirm`)).toBeTruthy();
    expect(screen.getByTestId(IDS.stage1Option(STAGE1_OUTCOME.MOVE_TO_STAGE2))).toBeTruthy();
  });
});
