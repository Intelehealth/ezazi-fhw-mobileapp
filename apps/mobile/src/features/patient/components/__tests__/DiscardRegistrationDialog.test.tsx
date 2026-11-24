import '@/core/i18n';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DiscardRegistrationDialog } from '../DiscardRegistrationDialog';

const onConfirm = jest.fn();
const onDismiss = jest.fn();

function renderDialog(visible = true) {
  return render(
    <DiscardRegistrationDialog
      visible={visible}
      onConfirm={onConfirm}
      onDismiss={onDismiss}
    />,
  );
}

describe('DiscardRegistrationDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title, the body and both answers', () => {
    renderDialog();

    expect(screen.getByText('Close patient registration?')).toBeTruthy();
    expect(
      screen.getByText('Are you sure you want to close the patient registration?'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'No' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy();
  });

  // Yes is the destructive answer and still the primary button — carried from
  // the legacy, whose positive button was also Yes.
  it('throws the registration away only when Yes is pressed', () => {
    renderDialog();

    fireEvent.press(screen.getByRole('button', { name: 'Yes' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('dismisses on No without confirming', () => {
    renderDialog();

    fireEvent.press(screen.getByRole('button', { name: 'No' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // The X is a third way out, equivalent to No.
  it('treats the X as No', () => {
    renderDialog();

    fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders nothing while it is not visible', () => {
    renderDialog(false);

    expect(screen.queryByText('Close patient registration?')).toBeNull();
  });
});
