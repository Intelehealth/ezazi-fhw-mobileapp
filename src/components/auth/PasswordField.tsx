import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppTextField } from '@/components/ui/AppTextField';
import { AppIcon } from '@/components/ui/icons';
import { colors } from '@/config/theme';

/**
 * AppTextField with an inline show/hide toggle.
 * forwardRef so parent can call .focus() for "next" field navigation.
 */

interface PasswordFieldProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label: string;
  error?: string;
}

export const PasswordField = forwardRef<TextInput, PasswordFieldProps>(
  ({ label, error, ...inputProps }, ref) => {
    const { t } = useTranslation();
    const [showPassword, setShowPassword] = useState(false);

    return (
      <AppTextField
        ref={ref}
        label={label}
        error={error}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        rightSlot={
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword(v => !v)}
            accessibilityRole="button"
            accessibilityLabel={
              showPassword
                ? t('common.a11y.hidePassword')
                : t('common.a11y.showPassword')
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppIcon
              name={showPassword ? 'eyeOff' : 'eyeOpen'}
              size={22}
              color={colors.icon}
            />
          </TouchableOpacity>
        }
        {...inputProps}
      />
    );
  },
);

PasswordField.displayName = 'PasswordField';

const styles = StyleSheet.create({
  eyeBtn: {
    paddingLeft: 8,
  },
});
