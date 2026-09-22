import React, { useRef, useState } from 'react';
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
  /** Absolute window Y of the first field below this header (measured by the
   *  screen via measureInWindow) — the shield's bottom edge is positioned to
   *  land exactly there. See shieldTop below for why this replaced a tuned
   *  constant. */
  firstFieldY?: number | null;
}

export const ForgotPasswordHeader: React.FC<ForgotPasswordHeaderProps> = ({
  title,
  subtitle,
  onBack,
  firstFieldY,
}) => {
  const { t } = useTranslation();
  const { isTablet, fs, scale } = useResponsive();
  const titleRowRef = useRef<View>(null);
  const [titleRowWindowY, setTitleRowWindowY] = useState<number | null>(null);

  // Phone only: push below the status bar to avoid overlap (mirrors the old WaveHeader).
  const statusBarH = !isTablet && Platform.OS === 'android'
    ? (StatusBar.currentHeight ?? 24)
    : 0;

  const logoH = isTablet ? scale(44) : 32;
  const logoW = logoH * LOGO_ASPECT;
  const shieldH = isTablet ? scale(106) : 78;
  const shieldW = shieldH * SHIELD_ASPECT;
  // Pushes the shield down past the heading/subtitle so its bottom edge
  // lands on the first field's top border below (RN doesn't clip overflow,
  // so it's safe to reach past the header's own box into the screen
  // content; the field's opaque background naturally clips it right at the
  // border).
  //
  // This used to be a tuned pixel constant, twice — first it overlapped the
  // field, then (after tuning it against one device) it either overlapped
  // or left a gap on OTHER devices. The header's own height isn't a fixed
  // multiple of scale: heading/subtitle font size and line-height grow with
  // it too, so no single formula (flat or scaled) tracks the field's real
  // position across every screen width. Measuring it is the only thing
  // that's actually correct everywhere — same approach LoginScreen/
  // SetupScreen already use for their illustration over the USERNAME/
  // LOCATION field.
  //
  // Falls back to the old flat-tablet/phone tuned values for the one frame
  // before both measurements land (same "one frame at a guessed position"
  // trade-off Login/Setup already accept).
  const measuredShieldTop = firstFieldY != null && titleRowWindowY != null
    ? firstFieldY - titleRowWindowY - shieldH
    : null;
  const shieldTop = measuredShieldTop ?? (isTablet ? 223 - shieldH : 74);

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
      <View
        ref={titleRowRef}
        style={[styles.titleRow, { marginTop: isTablet ? 90 : 108 }]}
        onLayout={() => {
          titleRowRef.current?.measureInWindow((_x, y) => setTitleRowWindowY(y));
        }}
      >
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
