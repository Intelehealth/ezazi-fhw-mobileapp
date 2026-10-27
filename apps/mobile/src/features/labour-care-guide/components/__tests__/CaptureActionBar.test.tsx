import '@/core/i18n';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { CaptureActionBar } from '../CaptureActionBar';

const setup = (showBack: boolean, nextDisabled = false) => {
  const handlers = { onBack: jest.fn(), onVideoCall: jest.fn(), onChat: jest.fn(), onRx: jest.fn(), onNext: jest.fn() };
  render(<CaptureActionBar showBack={showBack} nextDisabled={nextDisabled} {...handlers} />);
  return handlers;
};

describe('CaptureActionBar', () => {
  it('has no Back on the first tab', () => {
    setup(false);
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });

  it('routes each action to its handler', () => {
    const handlers = setup(true);
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    expect(handlers.onBack).toHaveBeenCalled();
    expect(handlers.onNext).toHaveBeenCalled();
  });

  it('disables Next while saving', () => {
    const handlers = setup(true, true);
    fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    expect(handlers.onNext).not.toHaveBeenCalled();
  });
});
