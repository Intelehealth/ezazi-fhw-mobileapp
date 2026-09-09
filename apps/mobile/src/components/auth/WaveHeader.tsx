import React from 'react';
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { AppIcon, wavePaths } from '@/components/ui/icons';
import { colors, dimens } from '@/config/theme';
import { useResponsive } from '@/hooks/useResponsive';

/** Pink wave banner with back button — shared by the forgot-password screens. */

const HEADER_HEIGHT_RATIO = 400 / 800;
const TEXT_GAP_BELOW_BTN = 14;

interface WaveHeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
}

export const WaveHeader: React.FC<WaveHeaderProps> = ({
  title,
  subtitle,
  onBack,
}) => {
  const { t } = useTranslation();
  const { width, isTablet, fs } = useResponsive();

  const headerH = width * HEADER_HEIGHT_RATIO;

  // Phone only: push back button below the status bar to avoid overlap.
  // Tablet uses the proportional top (headerH * 0.15) which already clears its status bar.
  const statusBarH = !isTablet && Platform.OS === 'android'
    ? (StatusBar.currentHeight ?? 24)
    : 0;
  const backBtnTop    = isTablet ? headerH * 0.15 : statusBarH + 16;
  const backBtnSize   = isTablet ? 48 : 40;
  const backBtnLeft   = isTablet ? dimens.screenHPad : 16;

  // Title + subtitle start at the back button's right edge.
  const textIndent = backBtnLeft + backBtnSize;
  const textPaddingTop = backBtnTop + backBtnSize + TEXT_GAP_BELOW_BTN;

  return (
    <View style={[
      styles.header,
      { height: headerH },
      // Phone: text below the back button. Tablet: text vertically centred.
      !isTablet && { justifyContent: 'flex-start', paddingTop: textPaddingTop },
    ]}>
      <Svg
        viewBox={wavePaths.headerTop.viewBox}
        preserveAspectRatio="none"
        width={width}
        height={headerH}
        style={StyleSheet.absoluteFillObject}
      >
        <Path d={wavePaths.headerTop.d} fill={colors.wavePink} fillOpacity={0.39} />
      </Svg>

      <TouchableOpacity
        style={[
          styles.backBtn,
          { top: backBtnTop, left: backBtnLeft },
          isTablet && styles.backBtnTablet,
        ]}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={t('common.a11y.goBack')}
        activeOpacity={0.8}
      >
        <AppIcon name="arrowLeft" size={isTablet ? 22 : 18} color={colors.white} />
      </TouchableOpacity>

      <View style={{ marginLeft: textIndent }}>
        <Text style={[styles.title, { fontSize: fs('headerTitle') }]}>
          {title}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    width:           '100%',
    backgroundColor: colors.white,
    overflow:        'hidden',
    justifyContent:  'center',
  },

  backBtn: {
    position:        'absolute',
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
    elevation:       3,
    shadowColor:     colors.black,
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.2,
    shadowRadius:    3,
  },

  backBtnTablet: {
    width:        48,
    height:       48,
    borderRadius: 24,
  },

  title: {
    color:        colors.textPrimary,
    fontWeight:   '700',
    marginBottom: 8,
  },

  subtitle: {
    color:      colors.textPrimary,
    fontSize:   14,
    lineHeight: 20,
  },
});
