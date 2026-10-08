import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from 'react-native-notify-kit';
import { handleTriggerDelivered } from '../backboneTrigger';
import { MONITOR_TRIGGER_NOTIFICATION_ID, MONITOR_TRIGGER_RUNNING_FLAG_KEY } from '../constants';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: {
    cancelDisplayedNotification: jest.fn().mockResolvedValue(undefined),
    createTriggerNotification: jest.fn().mockResolvedValue('id'),
  },
  AlarmType: { SET_EXACT_AND_ALLOW_WHILE_IDLE: 1 },
  AndroidImportance: { MIN: 1 },
  TriggerType: { TIMESTAMP: 0 },
}));

describe('handleTriggerDelivered', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('dismisses the displayed trigger notification, then re-arms the next one while running', async () => {
    await AsyncStorage.setItem(MONITOR_TRIGGER_RUNNING_FLAG_KEY, 'true');

    await handleTriggerDelivered();

    expect(notifee.cancelDisplayedNotification).toHaveBeenCalledWith(MONITOR_TRIGGER_NOTIFICATION_ID);
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
  });

  it('records the tick', async () => {
    await AsyncStorage.setItem(MONITOR_TRIGGER_RUNNING_FLAG_KEY, 'true');

    await handleTriggerDelivered();
    await handleTriggerDelivered();

    expect(await AsyncStorage.getItem('monitor_trigger_tick_count')).toBe('2');
  });

  it('does not re-arm once stopped', async () => {
    await AsyncStorage.setItem(MONITOR_TRIGGER_RUNNING_FLAG_KEY, 'false');

    await handleTriggerDelivered();

    expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
  });

  it('still re-arms the chain when dismissing the notification fails', async () => {
    await AsyncStorage.setItem(MONITOR_TRIGGER_RUNNING_FLAG_KEY, 'true');
    (notifee.cancelDisplayedNotification as jest.Mock).mockRejectedValueOnce(new Error('native failure'));

    await handleTriggerDelivered();

    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
  });
});
