import React from 'react';
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { colors, dimens } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { AppIcon } from './icons';
import { Text } from './Text';

/**
 * THE app button — the RN equivalent of Android's Theme.EZazi.Button styles.
 * Do not re-declare button styles in screens; extend this component instead.
 *
 * variant 'primary'     → Theme.EZazi.Button        (purple fill, white text)
 * variant 'outline'     → Theme.EZazi.Button.White  (white fill, gray stroke, purple text)
 * variant 'destructive' → red fill, white text — logout/delete/reject actions
 * variant 'secondary'   → Figma "secondary button" (white fill, #D5D7DA stroke, gray-700 text)
 * disabledTone 'brand'  → Figma "disbaled" button (#C5C2D0 fill, white text);
 *                         'neutral' (default) keeps the Android gray disabled look
 * showArrow             → legacy iconGravity=end arrow pinned to the right edge
 * size 'compact'        → Figma in-card button (Timeline "Record Now"): 50 units tall on the
 *                         tablet frame, smaller label
 * showChevron           → chevron (›) right after the label, centred with it (Figma "Record Now")
 */

type AppButtonVariant = 'primary' | 'outline' | 'secondary' | 'destructive';
type AppButtonDisabledTone = 'neutral' | 'brand';
type AppButtonSize = 'regular' | 'compact';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  showArrow?: boolean;
  showChevron?: boolean;
  size?: AppButtonSize;
  disabled?: boolean;
  disabledTone?: AppButtonDisabledTone;
  /** Placement only (margins) — never colors or sizing. */
  style?: StyleProp<ViewStyle>;
}

export const AppButton: React.FC<AppButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  showArrow = false,
  showChevron = false,
  size = 'regular',
  disabled = false,
  disabledTone = 'neutral',
  style,
}) => {
  const { isTablet, fs, cornerRadius, scale, fromFigma } = useResponsive();
  const compact = size === 'compact';
  // Flat per phone/tablet, NOT run through scale() — a touch target doesn't
  // need to grow with screen width the way text/icons do, and doing so blew
  // the button up to ~85dp on the 11" A11+ (64 * ~1.33), visibly oversized.
  // Compact follows its Figma frame instead, like the rest of the Timeline.
  const regularHeight = isTablet ? dimens.buttonHeight.tablet : dimens.buttonHeight.phone;
  const height = compact ? (isTablet ? fromFigma(50) : dimens.compactButtonHeight) : regularHeight;
  const labelSize = compact ? (isTablet ? fromFigma(18) : fs('compactButton')) : fs('button');
  const labelColor = disabled ? colors.disabledText : colors.onPrimary;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        { height, borderRadius: cornerRadius },
        styles[variant],
        disabled && (disabledTone === 'brand' ? styles.disabledBrand : styles.disabled),
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.85}
    >
      <Text
        style={[
          styles.label,
          variant === 'outline' && styles.labelOutline,
          variant === 'secondary' && styles.labelSecondary,
          disabled && (disabledTone === 'brand' ? styles.labelDisabledBrand : styles.labelDisabled),
          { fontSize: labelSize },
        ]}
      >
        {label}
      </Text>

      {showChevron && <AppIcon name="chevronRight" size={labelSize + 4} color={labelColor} />}

      {showArrow && (
        <View style={styles.arrowWrap}>
          <AppIcon
            name="arrowNext"
            size={isTablet ? scale(28) : 24}
            color={labelColor}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  primary: {
    backgroundColor: colors.primary,
  },

  // Theme.EZazi.Button.White — gray_2 stroke, purple text
  outline: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray_2,
  },

  // Figma Component 1 / "secondary button"
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.buttonSecondaryBorderFigma,
  },

  destructive: {
    backgroundColor: colors.error,
  },

  // Android-style disabled button: gray fill, gray label
  disabled: {
    backgroundColor: colors.disabledBg,
    borderWidth: 0,
  },

  // Figma Component 1 / "disbaled" — lavender fill, white label
  disabledBrand: {
    backgroundColor: colors.buttonDisabledFigma,
    borderWidth: 0,
  },

  label: {
    color: colors.onPrimary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  labelOutline: {
    color: colors.primary,
  },

  labelSecondary: {
    color: colors.buttonSecondaryTextFigma,
  },

  labelDisabled: {
    color: colors.disabledText,
  },

  labelDisabledBrand: {
    color: colors.onPrimary,
  },

  arrowWrap: {
    position: 'absolute',
    right: dimens.btnArrowInset,
  },
});
