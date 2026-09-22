import React from 'react';
import {
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '@/core/ui/icons';
import { Text } from '@/core/ui/Text';
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
  const { isTablet, fs, scale } = useResponsive();

  // Phone only: push below the status bar to avoid overlap (mirrors the old WaveHeader).
  const statusBarH = !isTablet && Platform.OS === 'android'
    ? (StatusBar.currentHeight ?? 24)
    : 0;

  const logoH = isTablet ? scale(44) : 32;
  const logoW = logoH * LOGO_ASPECT;
  const shieldH = isTablet ? scale(106) : 78;
  const shieldW = shieldH * SHIELD_ASPECT;
  // Pushes the shield down past the heading/subtitle so its bottom edge
  // lands on the first field's top border below — the header doesn't know
  // the field's exact position, so this is a tuned offset, not a measured
  // one (RN doesn't clip overflow, so it's safe to reach past the header's
  // own box into the screen content; the field's opaque background
  // naturally clips it right at the border).
  //
  // The field below doesn't move when the tablet scale grows (its position
  // comes from the screen's own flat content padding, unrelated to this
  // header), so the shield's BOTTOM edge — top + height — has to stay
  // pinned at that same tuned target regardless of scale. Scaling shieldTop
  // the same way shieldH scales made the bottom edge drift further down as
  // the icon grew, overshooting into the field below. Keep the target
  // constant and let shieldTop shrink as shieldH grows instead.
  //
  // 223, not the original 72 + 106 (178) — that undershot, leaving a visible
  // gap above the field instead of touching it (measured via on-device
  // element bounds: field top sat 45dp below the shield's bottom edge).
  const SHIELD_BOTTOM_TABLET = 223;
  const shieldTop = isTablet ? SHIELD_BOTTOM_TABLET - shieldH : 74;

  return (
    <View style={[styles.container, { paddingTop: statusBarH + (isTablet ? scale(24) : 16) }]}>
      <TouchableOpacity
        style={[
          styles.backBtn,
          isTablet && {
            width: scale(44),
            height: scale(44),
            borderRadius: scale(12),
          },
        ]}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={t('common.a11y.goBack')}
        activeOpacity={0.8}
      >
        <AppIcon name="chevronLeft" size={isTablet ? scale(24) : 20} color={colors.primary} />
      </TouchableOpacity>

      {/* Logo + heading + subtitle stack in normal flow; the shield badge is
          the LAST child (absolutely positioned, top-right) so it paints on
          top of them, overlapping down past the heading (per Figma). */}
      {/* Phone only: 20% more gap above the logo/heading block than tablet
          gets — requested specifically for phone, tablet's 90dp is unchanged. */}
      <View style={[styles.titleRow, { marginTop: isTablet ? 90 : 108 }]}>
        <View style={[styles.titleBlock, { paddingRight: shieldW + 12 }]}>
          <Image
            source={clientConfig.assets.setupLogo ?? clientConfig.assets.logo}
            style={{ width: logoW, height: logoH }}
            resizeMode="contain"
          />

          <Text style={[styles.heading, { fontSize: fs('headerTitle') }]}>{title}</Text>
          {!!subtitle && (
            <Text
              style={[
                styles.subtitle,
                { fontSize: fs('instruction'), lineHeight: Math.round(fs('instruction') * 1.3) },
              ]}
            >
              {subtitle}
            </Text>
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

  titleRow: {},

  // Right padding is computed inline (shieldW + gap) so the reserved room
  // scales with the shield's actual rendered size — see the paddingRight
  // override above. A static value here would fall out of sync once the
  // shield grows via scale() on wide tablets and text would run under it.
  titleBlock: {},

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
    marginTop: 4,
  },
});
