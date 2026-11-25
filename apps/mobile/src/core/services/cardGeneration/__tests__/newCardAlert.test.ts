import notifee from 'react-native-notify-kit';

import { NEW_CARD_CHANNEL_ID, NEW_CARD_NOTIFICATION_ID, NEW_CARD_SOUND } from '../constants';
import { alertNewCards } from '../newCardAlert';

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: { createChannel: jest.fn().mockResolvedValue('id'), displayNotification: jest.fn().mockResolvedValue('id') },
  AndroidImportance: { HIGH: 4 },
}));

describe('alertNewCards', () => {
  it("posts Android's alert on a high-importance channel with the al_1 sound, replacing the last one", async () => {
    await alertNewCards();

    expect(notifee.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({ id: NEW_CARD_CHANNEL_ID, importance: 4, sound: NEW_CARD_SOUND }),
    );
    expect(notifee.displayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: NEW_CARD_NOTIFICATION_ID,
        title: 'Alert!',
        body: 'Time to collect the History data!',
        android: expect.objectContaining({ channelId: NEW_CARD_CHANNEL_ID, sound: 'al_1' }),
      }),
    );
  });
});
