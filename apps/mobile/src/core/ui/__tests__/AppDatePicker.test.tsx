import '@/core/i18n';
import dayjs from 'dayjs';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AppDatePicker } from '../AppDatePicker';

const onChange = jest.fn();
const onClose = jest.fn();

// Fixed bounds so the grid never moves with the clock. The real screen passes
// 1 Jan 1970 and today - 13 years.
const FLOOR = new Date(1970, 0, 1);
const CEILING = new Date(2013, 5, 15);

function renderPicker(value: Date | null = null) {
  return render(
    <AppDatePicker
      visible
      value={value}
      onChange={onChange}
      onClose={onClose}
      minDate={FLOOR}
      maxDate={CEILING}
      displayFormat="DD-MM-YY"
      cancelLabel="Cancel"
      confirmLabel="Confirm"
    />,
  );
}

describe('AppDatePicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens on the ceiling month when nothing is chosen yet', () => {
    renderPicker();

    expect(screen.getByText('June 2013')).toBeTruthy();
  });

  it('keeps Confirm disabled until a day is staged', () => {
    renderPicker();

    const confirm = screen.getByRole('button', { name: 'Confirm' });
    expect(confirm.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: '10 June 2013' }));

    expect(
      screen.getByRole('button', { name: 'Confirm' }).props.accessibilityState.disabled,
    ).toBe(false);
  });

  // A day tap only stages; Confirm is what reports it.
  it('reports the staged day only once Confirm is pressed', () => {
    renderPicker();

    fireEvent.press(screen.getByRole('button', { name: '10 June 2013' }));
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(dayjs(onChange.mock.calls[0][0]).format('YYYY-MM-DD')).toBe('2013-06-10');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Cancel without reporting a date', () => {
    renderPicker();

    fireEvent.press(screen.getByRole('button', { name: '10 June 2013' }));
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('refuses a day past the ceiling', () => {
    renderPicker();

    const past = screen.getByRole('button', { name: '20 June 2013' });
    expect(past.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(past);
    fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  // A typed age can back-date below 1970, and reopening must land on the floor
  // rather than on a month the picker cannot reach.
  it('clamps the opening month up to the floor', () => {
    renderPicker(new Date(1950, 3, 9));

    expect(screen.getByText('January 1970')).toBeTruthy();
  });
});
