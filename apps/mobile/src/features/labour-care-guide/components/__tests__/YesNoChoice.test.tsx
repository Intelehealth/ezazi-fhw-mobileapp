import '@/core/i18n';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { YesNoAnswer } from '@ezazi/clinical-rules';

import { YesNoChoice } from '../YesNoChoice';

const setup = (value: YesNoAnswer, readOnly?: boolean) => {
  const onChange = jest.fn();
  render(<YesNoChoice value={value} onChange={onChange} readOnly={readOnly} />);
  return onChange;
};

const selected = (name: string) => screen.getByRole('radio', { name }).props.accessibilityState.selected;

/** The Yes / No that opens Oxytocin, Medicine and IV Fluids. */
describe('YesNoChoice', () => {
  it('offers Yes and No with neither picked before an answer', () => {
    setup(null);

    expect(selected('Yes')).toBe(false);
    expect(selected('No')).toBe(false);
  });

  it('reports the answer picked', () => {
    const onChange = setup(null);

    fireEvent.press(screen.getByRole('radio', { name: 'Yes' }));
    fireEvent.press(screen.getByRole('radio', { name: 'No' }));

    expect(onChange.mock.calls).toEqual([['yes'], ['no']]);
  });

  it('marks the saved answer', () => {
    setup('no');

    expect(selected('No')).toBe(true);
    expect(selected('Yes')).toBe(false);
  });

  it('shows the answer but cannot change it when read-only', () => {
    const onChange = setup('yes', true);

    fireEvent.press(screen.getByRole('radio', { name: 'No' }));

    expect(selected('Yes')).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });
});
