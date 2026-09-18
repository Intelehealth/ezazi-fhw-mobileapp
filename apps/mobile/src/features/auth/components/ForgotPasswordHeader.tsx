import React from 'react';
import {
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '@/core/ui/icons';
import { clientConfig } from '@/core/config/clients';
import { colors, dimens } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

/**
 * Flat white header shared by the Forgot Password flow — outlined back
 * button, then logo/heading/subtitle stacked in normal flow with the shield
 * badge absolutely positioned top-right overlapping them (Figma) — same
 * "text stack + absolutely-positioned art on top" composition LoginScreen
 * uses for its illustration over the USERNAME field.
 */

// assets/clients/default/setup_logo.png natural aspect ratio (width / height)
// — same asset + ratio LoginScreen/SetupScreen already use.
const LOGO_ASPECT = 364 / 144;

// assets/clients/default/forgot_password_shield.png natural aspect ratio (165 / 198)
const SHIELD_ASPECT = 165 / 198;

interface ForgotPasswordHeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
}

export const ForgotPasswordHeader: React.FC<ForgotPasswordHeaderProps> = ({
  title,
  subtitle,
  onBack,
}) => {
  const { t } = useTranslation();
  const { isTablet, fs } = useResponsive();

  // Phone only: push below the status bar to avoid overlap (mirrors the old WaveHeader).
  const statusBarH = !isTablet && Platform.OS === 'android'
    ? (StatusBar.currentHeight ?? 24)
    : 0;

  const logoH = isTablet ? 44 : 32;
  const logoW = logoH * LOGO_ASPECT;
  const shieldH = isTablet ? 106 : 78;
  const shieldW = shieldH * SHIELD_ASPECT;
  // Pushes the (unchanged-size) shield down past the heading/subtitle so its
  // bottom edge lands on the first field's top border below — the header
  // doesn't know the field's exact position, so this is a tuned offset, not
  // a measured one (RN doesn't clip overflow, so it's safe to reach past the
  // header's own box into the screen content; the field's opaque background
  // naturally clips it right at the border).
  const shieldTop = isTablet ? 72 : 74;

  return (
    <View style={[styles.container, { paddingTop: statusBarH + (isTablet ? 24 : 16) }]}>
      <TouchableOpacity
        style={[styles.backBtn, isTablet && styles.backBtnTablet]}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={t('common.a11y.goBack')}
        activeOpacity={0.8}
      >
        <AppIcon name="chevronLeft" size={isTablet ? 24 : 20} color={colors.primary} />
      </TouchableOpacity>

      {/* Logo + heading + subtitle stack in normal flow; the shield badge is
          the LAST child (absolutely positioned, top-right) so it paints on
          top of them, overlapping down past the heading (per Figma). */}
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Image
            source={clientConfig.assets.setupLogo ?? clientConfig.assets.logo}
            style={{ width: logoW, height: logoH }}
            resizeMode="contain"
          />

          <Text style={[styles.heading, { fontSize: fs('headerTitle') }]}>{title}</Text>
          {!!subtitle && (
            <Text style={[styles.subtitle, { fontSize: fs('instruction') }]}>{subtitle}</Text>
          )}
        </View>

        {clientConfig.assets.forgotPasswordShield ? (
          <Image
            source={clientConfig.assets.forgotPasswordShield}
            style={[styles.shield, { width: shieldW, height: shieldH, top: shieldTop }]}
            resizeMode="contain"
          />
        ) : (
          <View
            style={[styles.shield, { width: shieldH, height: shieldH, top: shieldTop }]}
            pointerEvents="none"
          >
            <AppIcon name="shieldLock" size={shieldH} color={colors.primary} />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.white,
    paddingHorizontal: dimens.screenHPad,
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray_2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backBtnTablet: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },

  titleRow: {
    marginTop: 90,
  },

  // Reserve room on the right so the heading/subtitle text never runs under
  // the shield even on narrow phones or long locale strings.
  titleBlock: {
    paddingRight: 96,
  },

  shield: {
    position: 'absolute',
    right: 0,
  },

  heading: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: 10,
  },

  subtitle: {
    color: colors.darkGray,
    lineHeight: 20,
    marginTop: 4,
  },
});
