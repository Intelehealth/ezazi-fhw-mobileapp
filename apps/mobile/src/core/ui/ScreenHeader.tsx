import React from 'react';
import {
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '@/core/ui/icons';
import { Text } from './Text';
import { colors, dimens, fontSizes, radii } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

/**
 * Action-bar header — white background matching Android BaseActionBarActivity,
 * purple rounded-rectangle back button with white arrow, dark title.
 */

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, onBack }) => {
  const { t } = useTranslation();
  const { isTablet, scale } = useResponsive();

  const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? dimens.statusBarFallback) : 0;
  const btnSize    = isTablet ? scale(48) : dimens.screenHeaderButton;
  const iconSize   = isTablet ? scale(22) : dimens.screenHeaderIcon;
  const barHeight  = isTablet ? scale(64) : dimens.screenHeaderHeight;
  const titleSize  = isTablet ? scale(22) : fontSizes.screenHeaderTitle.phone;

  return (
    <View style={[styles.container, { paddingTop: statusBarH }]}>
      <View style={[styles.row, { height: barHeight }]}>
        <TouchableOpacity
          style={[
            styles.backBtn,
            { width: btnSize, height: btnSize, borderRadius: isTablet ? scale(14) : radii.headerBackButton },
          ]}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t('common.a11y.goBack')}
          activeOpacity={0.8}
        >
          <AppIcon name="arrowLeft" size={iconSize} color={colors.white} />
        </TouchableOpacity>

        <Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor:   colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.headerBorder,
    elevation:         2,
    shadowColor:       colors.black,
    shadowOffset:      { width: 0, height: 1 },
    shadowOpacity:     0.08,
    shadowRadius:      2,
  },

  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: dimens.screenHeaderHPad,
    gap:               dimens.screenHeaderGap,
  },

  backBtn: {
    backgroundColor: colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
    elevation:       3,
    shadowColor:     colors.black,
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.2,
    shadowRadius:    3,
  },

  title: {
    flex:       1,
    fontWeight: '600',
    color:      colors.textPrimary,
  },
});
