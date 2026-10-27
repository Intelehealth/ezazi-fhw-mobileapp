import '@/core/i18n';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TimelineActionBar } from '../TimelineActionBar';

/** Each quick action reaches its own handler; End First Stage too. */
describe('TimelineActionBar', () => {
  it('calls the handler of the action pressed', () => {
    const handlers = {
      onSos: jest.fn(),
      onChat: jest.fn(),
      onVideoCall: jest.fn(),
      onRx: jest.fn(),
      onEndStage: jest.fn(),
    };
    render(<TimelineActionBar {...handlers} />);

    fireEvent.press(screen.getByRole('button', { name: 'Send SOS alert' }));
    fireEvent.press(screen.getByRole('button', { name: 'Open chat' }));
    fireEvent.press(screen.getByRole('button', { name: 'Start video call' }));
    fireEvent.press(screen.getByRole('button', { name: 'Open prescription' }));
    fireEvent.press(screen.getByRole('button', { name: 'End First Stage' }));

    for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalledTimes(1);
    expect(screen.getByText('SOS')).toBeTruthy();
    expect(screen.getByText('Video Call')).toBeTruthy();
  });
});
