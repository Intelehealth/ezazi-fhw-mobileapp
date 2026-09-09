import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { WaveHeader } from '@/components/auth/WaveHeader';
import { OtpInput } from '@/components/auth/OtpInput';
import { AppButton } from '@/components/ui/AppButton';
import { FormScreenLayout } from '@/components/ui/FormScreenLayout';
import { commonStyles } from '@/components/ui/commonStyles';
import { colors } from '@/config/theme';
import { useResponsive } from '@/hooks/useResponsive';

// CountDownTimer(60000, 1000) from OTPVerificationFragment.java
const RESEND_COUNTDOWN_SEC = 60;

const OTP_LENGTH = 6;

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPasswordVerify'>;

export const ForgotPasswordVerifyOtpScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { fs } = useResponsive();

  const [otp, setOtp]                 = useState('');
  const [error, setError]             = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COUNTDOWN_SEC);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleResend = useCallback(() => {
    if (secondsLeft > 0) return;
    // TODO: call resend OTP API
    setSecondsLeft(RESEND_COUNTDOWN_SEC);
    setOtp('');
    setError('');
  }, [secondsLeft]);

  const validate = (): boolean => {
    if (otp.length < OTP_LENGTH) {
      setError(t('forgotPassword.verify.errors.otpRequired'));
      return false;
    }
    setError('');
    return true;
  };

  const handleContinue = () => {
    if (!validate()) return;
    // TODO: replace with authApi.verifyOtp() → navigate on success
    navigation.navigate('ForgotPasswordReset', {
      userUuid: 'mock',
      otpToken: otp,
    });
  };

  const handleOtpChange = (val: string) => {
    setOtp(val);
    if (error) setError('');
  };

  const isFormValid = otp.length === OTP_LENGTH;

  return (
    <FormScreenLayout
      header={
        <WaveHeader
          title={t('forgotPassword.title')}
          subtitle={t('forgotPassword.subtitle')}
          onBack={() => navigation.goBack()}
        />
      }
      footer={
        <AppButton
          label={t('forgotPassword.verify.submit')}
          onPress={handleContinue}
          disabled={!isFormValid}
          showArrow
        />
      }
      contentStyle={styles.content}
    >
      <Text style={[commonStyles.fieldHeading, styles.heading, { fontSize: fs('heading') }]}>
        {t('forgotPassword.verify.heading')}
      </Text>

      <Text style={[commonStyles.instruction, styles.instruction, { fontSize: fs('instruction') }]}>
        {t('forgotPassword.verify.instruction')}
      </Text>

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

      {/* "Didn't receive OTP?  Resend in X seconds" / "Resend" link */}
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
    paddingTop: 50,
  },

  heading: {
    marginBottom: 8,
  },

  instruction: {
    marginTop:    12,
    marginBottom: 24,
  },

  errorText: {
    marginTop: 6,
  },

  resendRow: {
    flexDirection: 'row',
    alignItems:    'center',
    marginTop:     24,
    flexWrap:      'wrap',
  },

  notReceivedText: {
    color: colors.darkGray,
  },

  resendTimerText: {
    color: colors.primary,
  },
});
