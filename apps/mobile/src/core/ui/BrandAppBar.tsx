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
import { Text } from './Text';
import { colors, dimens, fontSizes, spacing } from '@/core/config/theme';
import { clientConfig } from '@/core/config/clients';
import { format24HourTime, formatDate, isBsDefault } from '@/core/utils/calendar';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { useSyncStatusStore } from '@/core/session/syncStatus.store';

/**
 * The app bar — client wordmark, "Last Refreshed" + hamburger menu. Mounted by
 * the navigator (`brandAppBar` in navigation/screenOptions), never by a screen.
 * Tablet sizes are the design's (600dp reference); phone sizes are theme tokens.
 */

// setup_logo.png is pre-cropped (no padding) — same aspect as authFormScreen.styles
const LOGO_ASPECT = 364 / 144;

interface BrandAppBarProps {
  /** Omit while there's no menu to open — the icon then renders static. */
  onMenuPress?: () => void;
}

/** "15 Bhadra 2083 BS 01:19" (Nepal) / "15 Aug 2026 01:19" (AD clients). */
const formatLastRefreshed = (date: Date, bsSuffix: string): string =>
  `${formatDate(date)}${isBsDefault() ? ` ${bsSuffix}` : ''} ${format24HourTime(date)}`;

export const BrandAppBar: React.FC<BrandAppBarProps> = ({ onMenuPress }) => {
  const { t } = useTranslation();
  const lastRefreshedAt = useSyncStatusStore(s => s.lastRefreshedAt);
  const { isTablet, scale } = useResponsive();

  const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? dimens.statusBarFallback) : 0;
  const barHeight  = isTablet ? scale(56) : dimens.appBarHeight;
  const logoH      = isTablet ? scale(28) : dimens.appBarLogoHeight;
  const textSize   = isTablet ? scale(13) : fontSizes.appBarRefreshed.phone;
  const textLineH  = isTablet ? scale(17) : dimens.appBarTextLineHeight;
  const menuSize   = isTablet ? scale(24) : dimens.appBarMenuIcon;
  const hPad       = isTablet ? scale(30) : dimens.appBarHPad;

  const menuIcon = <AppIcon name="menu" size={menuSize} color={colors.secondaryTextFigma} />;

  return (
    <View testID="brand-app-bar" style={[styles.container, { paddingTop: statusBarH }]}>
      <View style={[styles.row, { height: barHeight, paddingHorizontal: hPad }]}>
        <Image
          source={clientConfig.assets.setupLogo ?? clientConfig.assets.logo}
          style={{ height: logoH, width: logoH * LOGO_ASPECT }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />

        <View style={styles.right}>
          <View>
            <Text style={[styles.refreshTxt, { fontSize: textSize, lineHeight: textLineH }]}>
              {t('appBar.lastRefreshed')}
            </Text>
            <Text style={[styles.refreshTxt, { fontSize: textSize, lineHeight: textLineH }]}>
              {formatLastRefreshed(lastRefreshedAt, t('appBar.bsSuffix'))}
            </Text>
          </View>

          {onMenuPress ? (
            <TouchableOpacity
              onPress={onMenuPress}
              accessibilityRole="button"
              accessibilityLabel={t('appBar.a11y.menu')}
              hitSlop={8}
              activeOpacity={0.7}
            >
              {menuIcon}
            </TouchableOpacity>
          ) : (
            menuIcon
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor:   colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.appBarBorder,
  },

  row: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },

  right: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.lg,
  },

  refreshTxt: {
    color: colors.secondaryTextFigma,
  },
});
