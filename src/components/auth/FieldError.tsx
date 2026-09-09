import React from 'react';
import { StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '@/config/theme';
import { useResponsive } from '@/hooks/useResponsive';

/**
 * Small red caption rendered below a form field when validation fails.
 *
 * `AppTextField` and `PasswordField` already render their own error text via
 * the `error` prop — you only need `<FieldError>` when the field is a custom
 * pressable (e.g. the Location dropdown in `SetupScreen`) that can't use
 * `AppTextField`'s built-in error slot.
 *
 * Matches Figma "Sign up all error fields" — colour = `palette.red` (#ED1A56),
 * font size follows `dimens.error` (12 / 13pt on phone / tablet).
 *
 * Renders `null` when `message` is empty so callers can spread it inline
 * without guard clauses.
 */
export interface FieldErrorProps {
  message?: string;
  style?: ViewStyle;
  /** Overrides accessibility label; defaults to the message itself. */
  accessibilityLabel?: string;
  /** For screens that align text right (existing pattern in this app). */
  align?: 'left' | 'right';
}

export const FieldError: React.FC<FieldErrorProps> = ({
  message,
  style,
  accessibilityLabel,
  align = 'left',
}) => {
  const { fs } = useResponsive();
  if (!message) return null;
  return (
    <Text
      style={[
        styles.text,
        { fontSize: fs('error'), textAlign: align },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? message}
      accessibilityLiveRegion="polite"
      testID="field-error"
    >
      {message}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    color: colors.error,
    marginTop: 4,
  },
});
