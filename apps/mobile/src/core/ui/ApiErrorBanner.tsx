import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { NetworkErrorIcon } from './icons';
import { colors } from '@/core/config/theme';
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
}

export const ApiErrorBanner: React.FC<ApiErrorBannerProps> = ({ banner }) => {
  const { t } = useTranslation();
  const { fs, cornerRadius } = useResponsive();

  if (banner.variant === 'network') {
    return (
      <View style={styles.networkBanner}>
        <View style={styles.networkIconCircle}>
          <NetworkErrorIcon size={20} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.networkTitle, { fontSize: fs('label') }]}>{banner.title}</Text>
          <Text style={[styles.networkMessage, { fontSize: fs('error') }]}>{banner.message}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.banner, { borderRadius: cornerRadius }]}>
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
    padding:         12,
    marginTop:       20,
  },

  icon: {
    width:            20,
    height:           20,
    borderRadius:     10,
    backgroundColor:  colors.error,
    alignItems:       'center',
    justifyContent:   'center',
    marginRight:      10,
    marginTop:        1,
  },

  iconGlyph: {
    color:      colors.white,
    fontSize:   13,
    lineHeight: 15,
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
    marginTop: 2,
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
    padding:         14,
    borderRadius:    14,
    gap:             14,
    marginTop:       20,
  },

  networkIconCircle: {
    width:            44,
    height:           44,
    borderRadius:     22,
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
    marginTop: 2,
  },
});
