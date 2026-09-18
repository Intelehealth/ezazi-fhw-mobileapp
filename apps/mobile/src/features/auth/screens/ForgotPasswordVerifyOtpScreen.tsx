import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { ForgotPasswordHeader } from '@/features/auth/components/ForgotPasswordHeader';
import { OtpInput } from '@/features/auth/components/OtpInput';
import { usePasswordResetStore } from '@/features/auth/stores/passwordReset.store';
import { AppButton } from '@/core/ui/AppButton';
import { FormScreenLayout } from '@/core/ui/FormScreenLayout';
import { commonStyles } from '@/core/ui/commonStyles';
import { colors } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

// CountDownTimer(60000, 1000) from OTPVerificationFragment.java
const RESEND_COUNTDOWN_SEC = 60;

// Figma — 4-digit OTP (confirmed 2026-09-16; supersedes the legacy 6-digit flow)
const OTP_LENGTH = 4;

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
  const { phoneNumber, countryCode } = route.params;
  const requestOtp = usePasswordResetStore(s => s.requestOtp);
  const verifyOtp  = usePasswordResetStore(s => s.verifyOtp);

  const [otp, setOtp]                 = useState('');
  const [error, setError]             = useState('');
  const [verified, setVerified]       = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COUNTDOWN_SEC);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleResend = useCallback(() => {
    if (secondsLeft > 0) return;
    void requestOtp({ phoneNumber, countryCode });
    setSecondsLeft(RESEND_COUNTDOWN_SEC);
    setOtp('');
    setError('');
  }, [secondsLeft, phoneNumber, countryCode, requestOtp]);

  const handleContinue = async () => {
    if (isSubmitting) return;

    if (otp.length < OTP_LENGTH) {
      setError(t('forgotPassword.verify.errors.otpRequired'));
      return;
    }

    setIsSubmitting(true);
    const result = await verifyOtp({ phoneNumber, countryCode, otp });
    setIsSubmitting(false);

    if (result.ok) {
      setError('');
      setVerified(true);
      setTimeout(() => {
        // replace, not navigate — Verify is a spent, single-use OTP step, so
        // Reset's back button should land on Setup/Login, not back on Verify.
        navigation.replace('ForgotPasswordReset', { userUuid: result.data.userUuid });
      }, VERIFIED_FLASH_MS);
    } else {
      setError(t('forgotPassword.verify.errors.otpIncorrect'));
    }
  };

  const handleOtpChange = (val: string) => {
    setOtp(val);
    if (error) setError('');
  };

  const isFormValid = otp.length === OTP_LENGTH;

  return (
    <FormScreenLayout
      header={
        <ForgotPasswordHeader
          title={t('forgotPassword.verify.heading')}
          subtitle={t('forgotPassword.verify.instruction', { maskedPhone: maskPhone(phoneNumber) })}
          onBack={() => navigation.goBack()}
        />
      }
      contentStyle={styles.content}
    >
      <OtpInput
        length={OTP_LENGTH}
        value={otp}
        onChange={handleOtpChange}
        hasError={!!error}
      />

      {!!error && (
        <Text style={[commonStyles.errorText, styles.errorText, { fontSize: fs('error') }]}>
          {error}
        </Text>
      )}

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
