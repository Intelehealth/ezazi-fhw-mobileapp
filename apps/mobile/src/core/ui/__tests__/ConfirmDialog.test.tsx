import '@/core/i18n';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Modal, Text } from 'react-native';
import { ConfirmDialog } from '../ConfirmDialog';

const setup = (overrides: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) => {
  const handlers = { onCancel: jest.fn(), onConfirm: jest.fn() };
  render(
    <ConfirmDialog
      visible
      tone="danger"
      title="Capture SOS observation?"
      message="This will open the SOS observation form."
      cancelLabel="Cancel"
      confirmLabel="Capture SOS"
      {...handlers}
      {...overrides}
    />,
  );
  return handlers;
};

describe('ConfirmDialog', () => {
  it('shows the title, message and both actions', () => {
    setup({ note: 'Continue only if an SOS assessment is needed.' });

    expect(screen.getByText('Capture SOS observation?')).toBeTruthy();
    expect(screen.getByText('This will open the SOS observation form.')).toBeTruthy();
    expect(screen.getByText('Continue only if an SOS assessment is needed.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Capture SOS' })).toBeTruthy();
  });

  it('leaves the note out when none is given', () => {
    setup();

    expect(screen.queryByText('Continue only if an SOS assessment is needed.')).toBeNull();
  });

  it('confirms and cancels through their own handlers', () => {
    const { onCancel, onConfirm } = setup();

    fireEvent.press(screen.getByRole('button', { name: 'Capture SOS' }));
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('closes with ✕ as Cancel unless a close handler is given', () => {
    const { onCancel } = setup();
    fireEvent.press(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    const onClose = jest.fn();
    setup({ onClose });
    fireEvent.press(screen.getAllByRole('button', { name: 'Close dialog' }).at(-1)!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while hidden', () => {
    setup({ visible: false });

    expect(screen.queryByText('Capture SOS observation?')).toBeNull();
  });

  it('one button and no ✕ when no cancel is given (a gate that cannot be dismissed)', () => {
    const onConfirm = jest.fn();
    render(
      <ConfirmDialog
        visible
        tone="warning"
        title="Permission required"
        message="Tap Continue, then turn on Alarms & reminders."
        confirmLabel="Continue"
        onConfirm={onConfirm}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
    expect(screen.queryByLabelText('Close dialog')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('names its parts after its testID, for QA locators', () => {
    setup({ testID: 'sos-dialog' });

    expect(screen.getByTestId('sos-dialog')).toBeTruthy();
    expect(screen.getByTestId('sos-dialog-close')).toBeTruthy();
    expect(screen.getByTestId('sos-dialog-cancel')).toBeTruthy();
    expect(screen.getByTestId('sos-dialog-confirm')).toBeTruthy();
  });

  it('success tone, content under the message, and the gradient primary button', () => {
    render(
      <ConfirmDialog visible tone="success" title="Successful" message="Your password has been updated." confirmLabel="Back to Login" onConfirm={jest.fn()} onClose={jest.fn()}>
        <Text>Summary</Text>
      </ConfirmDialog>,
    );

    expect(screen.getByText('Successful')).toBeTruthy();
    expect(screen.getByText('Summary')).toBeTruthy();
    expect(screen.getByTestId('app-button-gradient')).toBeTruthy();
    expect(screen.getByLabelText('Close dialog')).toBeTruthy();
  });

  it('a gate hides the ✕ but Back still closes, and buttons can carry fuller screen-reader names', () => {
    const onClose = jest.fn();
    render(
      <ConfirmDialog
        visible
        tone="warning"
        title="Permissions Required"
        message="Please grant them to continue."
        cancelLabel="Close Now"
        cancelAccessibilityLabel="Close app"
        confirmLabel="Retry"
        confirmAccessibilityLabel="Retry permission request"
        onCancel={onClose}
        onConfirm={jest.fn()}
        onClose={onClose}
        hideClose
      />,
    );

    expect(screen.queryByLabelText('Close dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Close app' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry permission request' })).toBeTruthy();
    screen.UNSAFE_getByType(Modal).props.onRequestClose();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
