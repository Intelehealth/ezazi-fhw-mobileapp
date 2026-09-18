import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { ForgotPasswordHeader } from '@/features/auth/components/ForgotPasswordHeader';
import { PasswordField } from '@/features/auth/components/PasswordField';
import { PasswordResetSuccessDialog } from '@/features/auth/components/PasswordResetSuccessDialog';
import { usePasswordResetStore } from '@/features/auth/stores/passwordReset.store';
import { AppButton } from '@/core/ui/AppButton';
import { FormScreenLayout } from '@/core/ui/FormScreenLayout';
import { AppIcon } from '@/core/ui/icons';
import { colors } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

// Exact regex from ResetPasswordFragment.java — isValidPassword()
// Requires: ≥1 digit, ≥1 lowercase, ≥1 uppercase, ≥1 symbol from @*#$%^&+=, no spaces, ≥8 chars
const PASSWORD_REGEX =
  /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@*#$%^&+=])(?=\S+$).{8,}$/;

// Figma — static requirements list, not a live-validated checklist (no
// screenshot shows an item turning "checked" even with a password typed).
const REQUIREMENT_KEYS = [
  'forgotPassword.reset.requirements.minLength',
  'forgotPassword.reset.requirements.uppercase',
  'forgotPassword.reset.requirements.specialChar',
  'forgotPassword.reset.requirements.number',
] as const;

type FormErrors = { newPassword?: string; confirmPassword?: string };

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPasswordReset'>;

export const ForgotPasswordResetScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { fs, cornerRadius } = useResponsive();
  const { userUuid } = route.params;
  const resetPassword = usePasswordResetStore(s => s.resetPassword);

  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors]                   = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [showSuccess, setShowSuccess]         = useState(false);

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

  const handleSave = async () => {
    if (isSubmitting || !validate()) return;

    setIsSubmitting(true);
    const result = await resetPassword({ userUuid, newPassword });
    setIsSubmitting(false);

    if (result.ok) {
      setShowSuccess(true);
    } else {
      setErrors({ confirmPassword: t('common.error') });
    }
  };

  const handleBackToLogin = () => {
    setShowSuccess(false);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const isFormValid =
    PASSWORD_REGEX.test(newPassword) && confirmPassword === newPassword;

  return (
    <FormScreenLayout
      header={
        <ForgotPasswordHeader
          title={t('forgotPassword.reset.heading')}
          subtitle={t('forgotPassword.reset.subtitle')}
          onBack={() => navigation.goBack()}
        />
      }
      contentStyle={styles.content}
    >
      {/* New password field */}
      <PasswordField
        label={t('forgotPassword.reset.newPassword')}
        placeholder={t('forgotPassword.reset.newPasswordPlaceholder')}
        value={newPassword}
        onChangeText={(text) => { setNewPassword(text); clearError('newPassword'); }}
        error={errors.newPassword}
        leftSlot={<AppIcon name="lock" size={20} color={colors.icon} />}
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />

      {/* Password requirements — static 2x2 grid on a light card (Figma) */}
      <View style={[styles.requirementsCard, { borderRadius: cornerRadius }]}>
        <Text style={[styles.requirementsLabel, { fontSize: fs('error') }]}>
          {t('forgotPassword.reset.passwordRequirementsLabel')}
        </Text>
        <View style={styles.requirementsGrid}>
          <View style={styles.requirementsRow}>
            <Text style={[styles.requirementText, { fontSize: fs('error') }]}>
              {t(REQUIREMENT_KEYS[0])}
            </Text>
            <Text style={[styles.requirementText, { fontSize: fs('error') }]}>
              {t(REQUIREMENT_KEYS[1])}
            </Text>
          </View>
          <View style={styles.requirementsRow}>
            <Text style={[styles.requirementText, { fontSize: fs('error') }]}>
              {t(REQUIREMENT_KEYS[2])}
            </Text>
            <Text style={[styles.requirementText, { fontSize: fs('error') }]}>
              {t(REQUIREMENT_KEYS[3])}
            </Text>
          </View>
        </View>
      </View>

      {/* Confirm password field */}
      <PasswordField
        ref={confirmRef}
        label={t('forgotPassword.reset.confirmPassword')}
        placeholder={t('forgotPassword.reset.confirmPasswordPlaceholder')}
        value={confirmPassword}
        onChangeText={(text) => { setConfirmPassword(text); clearError('confirmPassword'); }}
        error={errors.confirmPassword}
        leftSlot={<AppIcon name="lock" size={20} color={colors.icon} />}
        returnKeyType="done"
        onSubmitEditing={handleSave}
      />

      <AppButton
        label={t('forgotPassword.reset.submit')}
        onPress={handleSave}
        disabled={!isFormValid || isSubmitting}
        style={styles.button}
      />

      <PasswordResetSuccessDialog visible={showSuccess} onBackToLogin={handleBackToLogin} />
    </FormScreenLayout>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  content: {
    paddingTop: 40,
  },

  requirementsCard: {
    backgroundColor: colors.colorPrimaryLighter,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
    marginBottom: 20,
  },

  requirementsLabel: {
    color: colors.darkGray,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  requirementsGrid: {
    gap: 6,
  },

  requirementsRow: {
    flexDirection: 'row',
    gap: 12,
  },

  requirementText: {
    flex: 1,
    color: colors.darkGray,
    lineHeight: 18,
  },

  button: {
    marginTop: 48,
  },
});
