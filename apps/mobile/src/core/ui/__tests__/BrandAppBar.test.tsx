import '@/core/i18n';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { BrandAppBar } from '../BrandAppBar';
import { useSyncStatusStore } from '@/core/session/syncStatus.store';
import { formatDate } from '@/core/utils/calendar';

describe('BrandAppBar', () => {
  it('shows the last-refreshed time from the shared sync-status store', () => {
    const at = new Date(2026, 7, 31, 1, 19);
    useSyncStatusStore.getState().markRefreshed(at);

    render(<BrandAppBar />);

    expect(screen.getByText('Last Refreshed')).toBeTruthy();
    expect(screen.getByText(new RegExp(`^${formatDate(at)}.* 01:19$`))).toBeTruthy();
  });

  it('renders a static menu icon when no menu handler is given', () => {
    render(<BrandAppBar />);

    expect(screen.queryByRole('button', { name: 'Open menu' })).toBeNull();
  });

  it('calls onMenuPress when the menu is tapped', () => {
    const onMenuPress = jest.fn();
    render(<BrandAppBar onMenuPress={onMenuPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Open menu' }));

    expect(onMenuPress).toHaveBeenCalledTimes(1);
  });
});
