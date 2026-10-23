// Copies the new-card alert sound into Android res/raw at prebuild, so a notification channel
// can play it by name. android/ is generated (CLAUDE.md tripwire 7), so this is the only way in.
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const SOUNDS = ['assets/common/sounds/al_1.mp3']; // Android res/raw/al_1.mp3, the same file

module.exports = function withAlertSound(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const rawDir = path.join(modConfig.modRequest.platformProjectRoot, 'app/src/main/res/raw');
      fs.mkdirSync(rawDir, { recursive: true });
      for (const sound of SOUNDS) {
        fs.copyFileSync(path.join(modConfig.modRequest.projectRoot, sound), path.join(rawDir, path.basename(sound)));
      }
      return modConfig;
    },
  ]);
};
