import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { WaveHeader } from '@/components/auth/WaveHeader';
import { PasswordField } from '@/components/auth/PasswordField';
import { AppButton } from '@/components/ui/AppButton';
import { FormScreenLayout } from '@/components/ui/FormScreenLayout';
import { commonStyles } from '@/components/ui/commonStyles';
import { colors } from '@/config/theme';
import { useResponsive } from '@/hooks/useResponsive';

// Exact regex from ResetPasswordFragment.java — isValidPassword()
// Requires: ≥1 digit, ≥1 lowercase, ≥1 uppercase, ≥1 symbol from @*#$%^&+=, no spaces, ≥8 chars
const PASSWORD_REGEX =
  /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@*#$%^&+=])(?=\S+$).{8,}$/;

type FormErrors = { newPassword?: string; confirmPassword?: string };

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPasswordReset'>;

export const ForgotPasswordResetScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { fs } = useResponsive();

  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors]                   = useState<FormErrors>({});

  const confirmRef = useRef<TextInput>(null);

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const next: FormErrors = {};

    if (!newPassword) {
      next.newPassword = t('forgotPassword.reset.errors.newPasswordRequired');
    } else if (!PASSWORD_REGEX.test(newPassword)) {
      next.newPassword = t('forgotPassword.reset.errors.passwordInvalid');
    }

    if (!confirmPassword) {
      next.confirmPassword = t('forgotPassword.reset.errors.confirmRequired');
    } else if (newPassword && confirmPassword !== newPassword) {
      next.confirmPassword = t('forgotPassword.reset.errors.noMatch');
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSave = () => {
    if (!validate()) return;
    // TODO: call authApi.resetPassword({ userUuid, newPassword, otpToken })
    // Reset stack so the user is taken back to Setup cleanly
    navigation.reset({ index: 0, routes: [{ name: 'Setup' }] });
  };

  const isFormValid =
    PASSWORD_REGEX.test(newPassword) && confirmPassword === newPassword;

  return (
    <FormScreenLayout
      header={
        <WaveHeader
          title={t('forgotPassword.reset.title')}
          subtitle={t('forgotPassword.reset.subtitle')}
          onBack={() => navigation.goBack()}
        />
      }
      footer={
        <AppButton
          label={t('forgotPassword.reset.submit')}
          onPress={handleSave}
          disabled={!isFormValid}
          showArrow
        />
      }
      contentStyle={styles.content}
    >
      {/* "Enter your new password" — enter_new_password_title, 16sp, font_black_0 */}
      <Text style={[commonStyles.fieldHeading, styles.sectionHeading, { fontSize: fs('heading') }]}>
        {t('forgotPassword.reset.heading')}
      </Text>

      {/* New password field */}
      <PasswordField
        label={t('forgotPassword.reset.newPassword')}
        placeholder={t('forgotPassword.reset.newPasswordPlaceholder')}
        value={newPassword}
        onChangeText={(text) => { setNewPassword(text); clearError('newPassword'); }}
        error={errors.newPassword}
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />

      {/* Password strength hint — reset_password_hint, caption 12sp, darkGray */}
      <Text style={[styles.pwdHint, { fontSize: fs('error') }]}>
        {t('forgotPassword.reset.passwordHint')}
      </Text>

      {/* Confirm password field */}
      <PasswordField
        ref={confirmRef}
        label={t('forgotPassword.reset.confirmPassword')}
        placeholder={t('forgotPassword.reset.confirmPasswordPlaceholder')}
        value={confirmPassword}
        onChangeText={(text) => { setConfirmPassword(text); clearError('confirmPassword'); }}
        error={errors.confirmPassword}
        returnKeyType="done"
        onSubmitEditing={handleSave}
      />
    </FormScreenLayout>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // action_bar_size (56dp) — tighter top spacing for reset screen
  content: {
    paddingTop: 52,
  },

  // enter_new_password_title — font_black_0, 16sp, semi-bold
  sectionHeading: {
    marginBottom: 32,
  },

  // reset_password_hint — Theme.EZazi.Caption, 12sp, darkGray
  pwdHint: {
    color:        colors.darkGray,
    lineHeight:   18,
    marginTop:    8,
    marginBottom: 20,
  },
});
