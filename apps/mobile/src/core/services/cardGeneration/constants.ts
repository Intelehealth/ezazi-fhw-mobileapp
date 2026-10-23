// New-card alert, as Android's CardGenerationEngine.alertToCollectHistoryData. Android fixes a
// channel's sound and importance at creation, so changing either needs a new channel id.
export const NEW_CARD_CHANNEL_ID = 'labour-new-card-v1';
// One id, so each alert replaces the last (Android posts every one as notification 100).
export const NEW_CARD_NOTIFICATION_ID = 'labour-new-card';
// Android res/raw/al_1, bundled by plugins/withAlertSound.js; named without its extension.
export const NEW_CARD_SOUND = 'al_1';
