import '@/core/i18n';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TimelineCheckpointCard } from '../TimelineCheckpointCard';
import type { TimelineCheckpoint } from '../../domain/timeline.types';

const NOW = new Date('2026-10-26T10:00:00.000Z');
const at = (minutesFromNow: number) => new Date(NOW.getTime() + minutesFromNow * 60_000).toISOString();

const renderCard = (checkpoint: Partial<TimelineCheckpoint>, onOpen = jest.fn()) => {
  render(
    <TimelineCheckpointCard
      checkpoint={{ id: 'c1', scheduledAt: at(-10), status: 'dueNow', ...checkpoint }}
      isFirst={false}
      isLast={false}
      onOpen={onOpen}
    />,
  );
  return onOpen;
};

/** One card per state, as Android's TimelineAdapter shows them (strings_ezazi.xml wording). */
describe('TimelineCheckpointCard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => jest.useRealTimers());

  it('opens a due card the nurse may write through Record Now', () => {
    const onOpen = renderCard({ status: 'dueNow', access: 'write' });

    expect(screen.getByText('DUE NOW')).toBeTruthy();
    expect(screen.getByText('Tap here to capture the observations')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Record Now' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('shows a due card without Record Now when the nurse does not hold the visit', () => {
    renderCard({ status: 'dueNow', access: 'none' });

    expect(screen.getByText('DUE NOW')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Record Now' })).toBeNull();
  });

  it('shows a completed card with its recorded time', () => {
    renderCard({ status: 'completed', recordedAt: at(-5), access: 'read' });

    expect(screen.getByText('COMPLETED')).toBeTruthy();
    expect(screen.getByText('You have captured the observations')).toBeTruthy();
    expect(screen.getByText(/^Recorded at /)).toBeTruthy();
  });

  it('offers Show on a submitted card the nurse may open, editable or read-only', () => {
    const onOpen = renderCard({ status: 'completed', recordedAt: at(-5), access: 'edit' });
    fireEvent.press(screen.getByRole('button', { name: 'Show' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Record Now' })).toBeNull();
  });

  it('offers Show on an older submitted card too (read-only)', () => {
    renderCard({ status: 'completed', recordedAt: at(-5), access: 'read' });
    expect(screen.getByRole('button', { name: 'Show' })).toBeTruthy();
  });

  it('offers no button on a submitted card the nurse cannot open, or on a missed card', () => {
    renderCard({ status: 'completed', recordedAt: at(-5), access: 'none' });
    expect(screen.queryByRole('button', { name: 'Show' })).toBeNull();
  });

  it('offers no button on a missed card', () => {
    renderCard({ status: 'missed', access: 'none' });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('marks an SOS card with its badge and SOS wording, in every state', () => {
    renderCard({ status: 'completed', isSos: true, access: 'read' });
    expect(screen.getByText('SOS')).toBeTruthy();
    expect(screen.getByText('You have submitted an SOS observation data')).toBeTruthy();

    renderCard({ status: 'dueNow', isSos: true, access: 'write' });
    expect(screen.getByText('Tap here to capture the SOS observations')).toBeTruthy();

    renderCard({ status: 'missed', isSos: true, access: 'none' });
    expect(screen.getByText('You have missed the collection of SOS observations')).toBeTruthy();
  });

  it('shows a missed card without Record Now', () => {
    renderCard({ status: 'missed', access: 'none' });

    expect(screen.getByText('MISSED')).toBeTruthy();
    expect(screen.getByText('You have missed the collection of observations')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Record Now' })).toBeNull();
  });

  it('shows the upcoming card with the minutes left and no Record Now', () => {
    renderCard({ status: 'upcoming', scheduledAt: at(30), access: 'none' });

    expect(screen.getByText('UPCOMING')).toBeTruthy();
    expect(screen.getByText(/\(in 30 min\)$/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Record Now' })).toBeNull();
  });

  it("shows Android's edit marker only on the editable card, and it opens the card", () => {
    const onOpen = renderCard({ status: 'completed', access: 'edit', showEditIcon: true, recordedAt: at(-5) });
    fireEvent.press(screen.getByRole('button', { name: 'Edit observation' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('no edit marker on a read-only card', () => {
    renderCard({ status: 'completed', access: 'read', showEditIcon: false, recordedAt: at(-5) });
    expect(screen.queryByRole('button', { name: 'Edit observation' })).toBeNull();
  });
});
