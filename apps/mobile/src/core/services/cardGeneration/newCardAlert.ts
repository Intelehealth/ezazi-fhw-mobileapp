import notifee, { AndroidImportance } from 'react-native-notify-kit';

import { i18n } from '@/core/i18n';

import { NEW_CARD_CHANNEL_ID, NEW_CARD_NOTIFICATION_ID, NEW_CARD_SOUND } from './constants';

/** "Alert!" / "Time to collect the History data!" with the al_1 sound; tapping opens the app. */
export async function alertNewCards(): Promise<void> {
  await notifee.createChannel({
    id: NEW_CARD_CHANNEL_ID,
    name: i18n.t('cardAlert.channelName'),
    importance: AndroidImportance.HIGH,
    sound: NEW_CARD_SOUND,
  });
  await notifee.displayNotification({
    id: NEW_CARD_NOTIFICATION_ID,
    title: i18n.t('cardAlert.title'),
    body: i18n.t('cardAlert.body'),
    android: { channelId: NEW_CARD_CHANNEL_ID, sound: NEW_CARD_SOUND, pressAction: { id: 'default' } },
  });
}
