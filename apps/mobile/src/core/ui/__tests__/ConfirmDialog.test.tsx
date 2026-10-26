import '@/core/i18n';
import { fireEvent, render, screen } from '@testing-library/react-native';
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
});
