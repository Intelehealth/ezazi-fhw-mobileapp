import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { RootStackParamList } from '@/navigation/types';
import { ForgotPasswordHeader } from '@/features/auth/components/ForgotPasswordHeader';
import { OtpInput } from '@/features/auth/components/OtpInput';
import { usePasswordResetStore } from '@/features/auth/stores/passwordReset.store';
import {
  createForgotPasswordVerifyFormSchema,
  OTP_LENGTH,
  type ForgotPasswordVerifyFormValues,
} from '@/features/auth/domain/forgotPasswordVerifyForm.schema';
import { ApiErrorBanner } from '@/core/ui/ApiErrorBanner';
import { AppButton } from '@/core/ui/AppButton';
import { FormScreenLayout } from '@/core/ui/FormScreenLayout';
import { Text } from '@/core/ui/Text';
import { commonStyles } from '@/core/ui/commonStyles';
import { colors } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { getApiErrorBanner, type ErrorBanner } from '@/core/utils/apiErrorBanner';
import { logger } from '@/core/utils/logger';

// CountDownTimer(60000, 1000) from OTPVerificationFragment.java
const RESEND_COUNTDOWN_SEC = 60;

// How long the green "OTP Verified" success text shows before navigating on (Figma).
const VERIFIED_FLASH_MS = 600;

/** "+9779841234567" -> "*********567" — mask everything but the last 3 digits (Figma). */
const maskPhone = (phone: string): string => {
  const visibleCount = 3;
  if (phone.length <= visibleCount) return phone;
  return '*'.repeat(phone.length - visibleCount) + phone.slice(-visibleCount);
};

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPasswordVerify'>;

export const ForgotPasswordVerifyOtpScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { fs } = useResponsive();
  const { phoneNumber, countryCode, origin } = route.params;
  const requestOtp = usePasswordResetStore(s => s.requestOtp);
  const verifyOtp  = usePasswordResetStore(s => s.verifyOtp);

  const [verified, setVerified]       = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COUNTDOWN_SEC);
  const [banner, setBanner]           = useState<ErrorBanner | null>(null);

  // Window Y of the OTP box row — see the shieldTop comment in
  // ForgotPasswordHeader for why this is measured rather than a tuned constant.
  const otpRowRef = useRef<View>(null);
  const [otpRowY, setOtpRowY] = useState<number | null>(null);

  const schema = useMemo(() => createForgotPasswordVerifyFormSchema(t), [t]);
  const {
    control,
    handleSubmit,
    clearErrors,
    resetField,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordVerifyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { otp: '' },
    reValidateMode: 'onSubmit',
  });

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const [isResending, setIsResending] = useState(false);

  const handleResend = useCallback(async () => {
    if (secondsLeft > 0 || isResending) return;

    setBanner(null);
    setIsResending(true);
    const result = await requestOtp({ phoneNumber, countryCode });
    setIsResending(false);

    if (result.ok) {
      setSecondsLeft(RESEND_COUNTDOWN_SEC);
      resetField('otp');
      clearErrors('otp');
    } else {
      // Leave secondsLeft at 0 (not a fresh 60s wait) so the link stays
      // tappable for an immediate retry — requestOtp() already logs the
      // failure (usePasswordResetStore), this just surfaces it on screen.
      setBanner(getApiErrorBanner(result.error, t, 'forgotPassword.verify.errors'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetField/clearErrors are stable
  }, [secondsLeft, isResending, phoneNumber, countryCode, requestOtp, t]);

  const onValidSubmit = async (data: ForgotPasswordVerifyFormValues) => {
    const result = await verifyOtp({ phoneNumber, countryCode, otp: data.otp });

    if (result.ok) {
      // Console-only — never shown on screen. password.api.ts's doc comment
      // flags this response shape as UNVERIFIED against the real backend
      // (no real OTP was available to test with at the time); log the raw
      // response so it can be confirmed the first time a real OTP is used.
      logger.debug('[ForgotPassword] verifyOtp response', result.data);
      setVerified(true);
      setTimeout(() => {
        // replace, not navigate — Verify is a spent, single-use OTP step, so
        // Reset's back button should land on Setup/Login, not back on Verify.
        navigation.replace('ForgotPasswordReset', { userUuid: result.data.userUuid, origin });
      }, VERIFIED_FLASH_MS);
    } else {
      setBanner(getApiErrorBanner(result.error, t, 'forgotPassword.verify.errors'));
    }
  };

  // isSubmitting guard: re-entrance while a verify call is already in flight.
  const handleContinue = () => {
    if (isSubmitting) return;
    setBanner(null);
    void handleSubmit(onValidSubmit)();
  };

  const isFormValid = watch('otp').length === OTP_LENGTH;

  return (
    <FormScreenLayout
      header={
        <ForgotPasswordHeader
          title={t('forgotPassword.verify.heading')}
          subtitle={t('forgotPassword.verify.instruction', { maskedPhone: maskPhone(phoneNumber) })}
          onBack={() => navigation.goBack()}
          firstFieldY={otpRowY}
        />
      }
      contentStyle={styles.content}
    >
      <View
        ref={otpRowRef}
        onLayout={() => {
          otpRowRef.current?.measureInWindow((_x, y) => setOtpRowY(y));
        }}
      >
        <Controller
          control={control}
          name="otp"
          render={({ field: { value, onChange } }) => (
            <OtpInput
              length={OTP_LENGTH}
              value={value}
              onChange={(val) => {
                onChange(val);
                if (errors.otp) clearErrors('otp');
              }}
              hasError={!!errors.otp}
            />
          )}
        />
      </View>

      {!!errors.otp && (
        <Text style={[commonStyles.errorText, styles.errorText, { fontSize: fs('error') }]}>
          {errors.otp.message}
        </Text>
      )}

      {/* ── API error banner — wrong-code/network/server failures from verifyOtp or resend ── */}
      {!!banner && <ApiErrorBanner banner={banner} />}

      {verified && (
        <Text style={[styles.verifiedText, { fontSize: fs('error') }]}>
          {t('forgotPassword.verify.verifiedText')}
        </Text>
      )}

      <AppButton
        label={t('forgotPassword.verify.submit')}
        onPress={handleContinue}
        disabled={!isFormValid || isSubmitting || verified}
        style={styles.button}
      />

      {/* "Didn't receive OTP?  Resend in Xs" / "Resend Code" link */}
      <View style={styles.resendRow}>
        <Text style={[styles.notReceivedText, { fontSize: fs('instruction') }]}>
          {t('forgotPassword.verify.notReceived')}{'  '}
        </Text>
        {secondsLeft > 0 ? (
          <Text style={[styles.resendTimerText, { fontSize: fs('instruction') }]}>
            {t('forgotPassword.verify.resendCountdown', { seconds: secondsLeft })}
          </Text>
        ) : (
          <TouchableOpacity
            onPress={handleResend}
            disabled={isResending}
            accessibilityRole="button"
            accessibilityLabel={t('forgotPassword.verify.a11y.resendOtp')}
          >
            <Text style={[commonStyles.link, { fontSize: fs('instruction') }]}>
              {t('forgotPassword.verify.resend')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </FormScreenLayout>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  content: {
    paddingTop: 40,
  },

  errorText: {
    marginTop: 6,
  },

  verifiedText: {
    marginTop: 6,
    color: colors.success,
    fontWeight: '600',
  },

  button: {
    marginTop: 48,
  },

  resendRow: {
    flexDirection: 'row',
    alignItems:    'center',
    justifyContent: 'center',
    marginTop:     20,
    flexWrap:      'wrap',
  },

  notReceivedText: {
    color: colors.darkGray,
  },

  resendTimerText: {
    color: colors.primary,
  },
});
