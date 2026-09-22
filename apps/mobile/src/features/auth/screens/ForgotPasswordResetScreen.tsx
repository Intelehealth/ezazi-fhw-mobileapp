import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { RootStackParamList } from '@/navigation/types';
import { ForgotPasswordHeader } from '@/features/auth/components/ForgotPasswordHeader';
import { PasswordField } from '@/features/auth/components/PasswordField';
import { PasswordResetSuccessDialog } from '@/features/auth/components/PasswordResetSuccessDialog';
import { usePasswordResetStore } from '@/features/auth/stores/passwordReset.store';
import {
  createForgotPasswordResetFormSchema,
  PASSWORD_REGEX,
  type ForgotPasswordResetFormValues,
} from '@/features/auth/domain/forgotPasswordResetForm.schema';
import { ApiErrorBanner } from '@/core/ui/ApiErrorBanner';
import { AppButton } from '@/core/ui/AppButton';
import { FormScreenLayout } from '@/core/ui/FormScreenLayout';
import { AppIcon } from '@/core/ui/icons';
import { Text } from '@/core/ui/Text';
import { colors } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { getApiErrorBanner, type ErrorBanner } from '@/core/utils/apiErrorBanner';

// Figma — static requirements list, not a live-validated checklist (no
// screenshot shows an item turning "checked" even with a password typed).
const REQUIREMENT_KEYS = [
  'forgotPassword.reset.requirements.minLength',
  'forgotPassword.reset.requirements.uppercase',
  'forgotPassword.reset.requirements.specialChar',
  'forgotPassword.reset.requirements.number',
] as const;

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPasswordReset'>;

export const ForgotPasswordResetScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { fs, cornerRadius } = useResponsive();
  const { userUuid, resetToken, origin } = route.params;
  const resetPassword = usePasswordResetStore(s => s.resetPassword);

  const [showSuccess, setShowSuccess] = useState(false);
  const [banner, setBanner] = useState<ErrorBanner | null>(null);
  const confirmRef = useRef<TextInput>(null);

  // Window Y of the NEW PASSWORD input box — see the shieldTop comment in
  // ForgotPasswordHeader for why this is measured rather than a tuned constant.
  const newPasswordRef = useRef<TextInput>(null);
  const [newPasswordFieldY, setNewPasswordFieldY] = useState<number | null>(null);

  const schema = useMemo(() => createForgotPasswordResetFormSchema(t), [t]);
  const {
    control,
    handleSubmit,
    clearErrors,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordResetFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
    reValidateMode: 'onSubmit',
  });

  const onValidSubmit = async (data: ForgotPasswordResetFormValues) => {
    const result = await resetPassword({ userUuid, newPassword: data.newPassword, resetToken });

    if (result.ok) {
      setShowSuccess(true);
    } else {
      setBanner(getApiErrorBanner(result.error, t, 'forgotPassword.reset.errors'));
    }
  };

  // isSubmitting guard: PasswordField's onSubmitEditing (keyboard "done")
  // bypasses AppButton's disabled state, so re-entrance is blocked here too.
  const handleSave = () => {
    if (isSubmitting) return;
    setBanner(null);
    void handleSubmit(onValidSubmit)();
  };

  // Back to whichever screen "Forgot password?" was tapped from — Setup on
  // first device setup, Login on every login after that — not always Login.
  const handleBackToLogin = () => {
    setShowSuccess(false);
    navigation.reset({ index: 0, routes: [{ name: origin }] });
  };

  const [newPasswordValue, confirmPasswordValue] = watch(['newPassword', 'confirmPassword']);
  const isFormValid =
    PASSWORD_REGEX.test(newPasswordValue) && confirmPasswordValue === newPasswordValue;

  return (
    <FormScreenLayout
      header={
        <ForgotPasswordHeader
          title={t('forgotPassword.reset.heading')}
          subtitle={t('forgotPassword.reset.subtitle')}
          onBack={() => navigation.goBack()}
          firstFieldY={newPasswordFieldY}
        />
      }
      contentStyle={styles.content}
    >
      {/* New password field */}
      <Controller
        control={control}
        name="newPassword"
        render={({ field: { value, onChange } }) => (
          <PasswordField
            ref={newPasswordRef}
            label={t('forgotPassword.reset.newPassword')}
            placeholder={t('forgotPassword.reset.newPasswordPlaceholder')}
            value={value}
            onChangeText={(text) => {
              onChange(text);
              if (errors.newPassword) clearErrors('newPassword');
            }}
            error={errors.newPassword?.message}
            leftSlot={<AppIcon name="lock" size={20} color={colors.icon} />}
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            onLayout={() => {
              newPasswordRef.current?.measureInWindow((_x, y) => setNewPasswordFieldY(y));
            }}
          />
        )}
      />

      {/* Password requirements — static 2x2 grid on a light card (Figma) */}
      <View style={[styles.requirementsCard, { borderRadius: cornerRadius }]}>
        <Text style={[styles.requirementsLabel, { fontSize: fs('error') }]}>
          {t('forgotPassword.reset.passwordRequirementsLabel')}
        </Text>
        <View style={styles.requirementsGrid}>
          <View style={styles.requirementsRow}>
            <Text style={[styles.requirementText, { fontSize: fs('error'), lineHeight: Math.round(fs('error') * 1.4) }]}>
              {t(REQUIREMENT_KEYS[0])}
            </Text>
            <Text style={[styles.requirementText, { fontSize: fs('error'), lineHeight: Math.round(fs('error') * 1.4) }]}>
              {t(REQUIREMENT_KEYS[1])}
            </Text>
          </View>
          <View style={styles.requirementsRow}>
            <Text style={[styles.requirementText, { fontSize: fs('error'), lineHeight: Math.round(fs('error') * 1.4) }]}>
              {t(REQUIREMENT_KEYS[2])}
            </Text>
            <Text style={[styles.requirementText, { fontSize: fs('error'), lineHeight: Math.round(fs('error') * 1.4) }]}>
              {t(REQUIREMENT_KEYS[3])}
            </Text>
          </View>
        </View>
      </View>

      {/* Confirm password field */}
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { value, onChange } }) => (
          <PasswordField
            ref={confirmRef}
            label={t('forgotPassword.reset.confirmPassword')}
            placeholder={t('forgotPassword.reset.confirmPasswordPlaceholder')}
            value={value}
            onChangeText={(text) => {
              onChange(text);
              if (errors.confirmPassword) clearErrors('confirmPassword');
            }}
            error={errors.confirmPassword?.message}
            leftSlot={<AppIcon name="lock" size={20} color={colors.icon} />}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
        )}
      />

      {/* ── API error banner — network/server failures from resetPassword ── */}
      {!!banner && <ApiErrorBanner banner={banner} />}

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
  },

  button: {
    marginTop: 48,
  },
});
