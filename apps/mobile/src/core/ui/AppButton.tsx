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
 * showArrow             → legacy iconGravity=end arrow pinned to the right edge
 */

type AppButtonVariant = 'primary' | 'outline' | 'destructive';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  showArrow?: boolean;
  disabled?: boolean;
  /** Placement only (margins) — never colors or sizing. */
  style?: StyleProp<ViewStyle>;
}

export const AppButton: React.FC<AppButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  showArrow = false,
  disabled = false,
  style,
}) => {
  const { isTablet, fs, cornerRadius, scale } = useResponsive();
  // Flat per phone/tablet, NOT run through scale() — a touch target doesn't
  // need to grow with screen width the way text/icons do, and doing so blew
  // the button up to ~85dp on the 11" A11+ (64 * ~1.33), visibly oversized.
  const height = isTablet ? dimens.buttonHeight.tablet : dimens.buttonHeight.phone;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        { height, borderRadius: cornerRadius },
        styles[variant],
        disabled && styles.disabled,
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
          disabled && styles.labelDisabled,
          { fontSize: fs('button') },
        ]}
      >
        {label}
      </Text>

      {showArrow && (
        <View style={styles.arrowWrap}>
          <AppIcon
            name="arrowNext"
            size={isTablet ? scale(28) : 24}
            color={disabled ? colors.disabledText : colors.onPrimary}
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

  destructive: {
    backgroundColor: colors.error,
  },

  // Android-style disabled button: gray fill, gray label
  disabled: {
    backgroundColor: colors.disabledBg,
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

  labelDisabled: {
    color: colors.disabledText,
  },

  arrowWrap: {
    position: 'absolute',
    right: dimens.btnArrowInset,
  },
});
