import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { NetworkErrorIcon } from './icons';
import { colors, dimens, fontSizes, radii } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import type { ErrorBanner } from '@/core/utils/apiErrorBanner';

/**
 * THE api-error banner — pale-red card with a filled circular "!" badge,
 * title + message (Figma: credentials/network/server error states). Pair
 * with getApiErrorBanner() to build the `banner` prop from an ApiError.
 *
 * Was hand-duplicated in LoginScreen and SetupScreen; every screen that
 * calls an API and wants to surface a failure uses this instead of
 * re-declaring the same View/Text tree.
 *
 * `banner.variant === 'network'` renders Figma's exact network-error state
 * (Ezazi Developer File, "Frame 427", 2026-09-22) instead — its own icon,
 * colors and fixed sizing, not the generic "!" badge below.
 */

interface ApiErrorBannerProps {
  banner: ErrorBanner;
  /** QA locator. */
  testID?: string;
}

export const ApiErrorBanner: React.FC<ApiErrorBannerProps> = ({ banner, testID }) => {
  const { t } = useTranslation();
  const { fs, cornerRadius } = useResponsive();

  if (banner.variant === 'network') {
    return (
      <View style={styles.networkBanner} testID={testID}>
        <View style={styles.networkIconCircle}>
          <NetworkErrorIcon size={dimens.networkBannerGlyph} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.networkTitle, { fontSize: fs('label') }]}>{banner.title}</Text>
          <Text style={[styles.networkMessage, { fontSize: fs('error') }]}>{banner.message}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.banner, { borderRadius: cornerRadius }]} testID={testID}>
      <View style={styles.icon}>
        <Text style={styles.iconGlyph}>{t('common.errorIconGlyph')}</Text>
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { fontSize: fs('label') }]}>{banner.title}</Text>
        <Text style={[styles.message, { fontSize: fs('error') }]}>{banner.message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    backgroundColor: colors.colorEmergencyBg,
    padding:         dimens.errorBannerPadding,
    marginTop:       dimens.errorBannerMarginTop,
  },

  icon: {
    width:            dimens.errorBannerIcon,
    height:           dimens.errorBannerIcon,
    borderRadius:     dimens.errorBannerIcon / 2,
    backgroundColor:  colors.error,
    alignItems:       'center',
    justifyContent:   'center',
    marginRight:      dimens.errorBannerIconGap,
    marginTop:        1,
  },

  iconGlyph: {
    color:      colors.white,
    fontSize:   fontSizes.errorBannerGlyph.phone,
    lineHeight: dimens.errorBannerGlyphLineHeight,
    fontWeight: '700',
  },

  textWrap: {
    flex: 1,
  },

  title: {
    color:      colors.error,
    fontWeight: '700',
  },

  message: {
    color:     colors.textSecondary,
    marginTop: dimens.errorBannerMessageGap,
  },

  // ── Network-error variant — Figma sizing (Ezazi Developer File "Frame
  // 427": 48px circle, 16px padding/gap/radius), trimmed down ~10% after
  // the user saw it live on the ~8.7" physical device and it read as too
  // tall for the screen — not the fs()/cornerRadius scale the rest of this
  // screen uses (see the class comment above). ──
  networkBanner: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    backgroundColor: colors.networkBannerBg,
    padding:         dimens.networkBannerPadding,
    borderRadius:    radii.networkBanner,
    gap:             dimens.networkBannerPadding,
    marginTop:       dimens.errorBannerMarginTop,
  },

  networkIconCircle: {
    width:            dimens.networkBannerIcon,
    height:           dimens.networkBannerIcon,
    borderRadius:     dimens.networkBannerIcon / 2,
    backgroundColor:  colors.networkBannerAlert,
    alignItems:       'center',
    justifyContent:   'center',
  },

  networkTitle: {
    color:      colors.networkBannerAlert,
    fontWeight: '700',
  },

  networkMessage: {
    color:     colors.networkBannerMessage,
    marginTop: dimens.errorBannerMessageGap,
  },
});
