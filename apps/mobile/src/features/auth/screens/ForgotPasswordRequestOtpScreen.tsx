import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { ForgotPasswordHeader } from '@/features/auth/components/ForgotPasswordHeader';
import { usePasswordResetStore } from '@/features/auth/stores/passwordReset.store';
import { AppButton } from '@/core/ui/AppButton';
import { FormScreenLayout } from '@/core/ui/FormScreenLayout';
import { AppIcon } from '@/core/ui/icons';
import { Text } from '@/core/ui/Text';
import { commonStyles } from '@/core/ui/commonStyles';
import { clientConfig } from '@/core/config/clients';
import { colors, dimens } from '@/core/config/theme';
import { env } from '@/core/config/env';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { logger } from '@/core/utils/logger';

const PHONE_REGEX = new RegExp(`^\\d{${clientConfig.phone.numberLength}}$`);

type Nav = NativeStackNavigationProp<RootStackParamList, 'ForgotPasswordRequest'>;

export const ForgotPasswordRequestOtpScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { isTablet, fs, cornerRadius, scale } = useResponsive();
  const requestOtp = usePasswordResetStore(s => s.requestOtp);

  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const trimmed = phone.trim();
    if (!trimmed) {
      setError(t('forgotPassword.request.errors.phoneRequired'));
      return false;
    }
    if (!PHONE_REGEX.test(trimmed)) {
      setError(t('forgotPassword.request.errors.phoneInvalid'));
      return false;
    }
    setError('');
    return true;
  };

  const handleContinue = async () => {
    if (isSubmitting || !validate()) return;

    const phoneNumber = phone.trim();
    // Bare digits, no "+" — matches the legacy CountryCodePicker.getSelectedCountryCode()
    // value the real auth-gateway expects (confirmed via its VALIDATION_ERROR field names).
    const countryCode = clientConfig.phone.dialCode.replace('+', '');

    // Console-only — the exact URL + body being sent, since the request
    // body itself is assembled inside passwordApi.requestOtp (otpFor/source
    // are baked in there, not visible from this call site otherwise).
    logger.debug('[ForgotPassword] requestOtp request', {
      url: `${env.AUTH_GATEWAY_URL}/auth/requestOtp`,
      body: { otpFor: 'password', phoneNumber, countryCode, source: 'mobile' },
    });

    setIsSubmitting(true);
    const result = await requestOtp({ phoneNumber, countryCode });
    setIsSubmitting(false);

    if (!result.ok) {
      // Console-only — never shown on screen. Visible via `adb logcat` /
      // the Metro terminal even when you can't see this session's console.
      logger.debug('[ForgotPassword] requestOtp failed', result.error);
      setError(t('forgotPassword.request.errors.phoneInvalid'));
      return;
    }

    // Console-only. The legacy Android app also gated on `role === "Nurse"`
    // here, but this backend's actual response is just
    // `{ message: "If the account exists, an OTP has been sent." }` —
    // no userUuid/role at all (confirmed live 2026-09-17, deliberately
    // account-existence-preserving). There's nothing to gate on any more;
    // any successful response proceeds to OTP verification.
    logger.debug('[ForgotPassword] requestOtp response', result.data);

    // replace, not navigate — Request is a spent step once OTP is sent, so
    // Verify's back button should land on Setup/Login, not back on Request.
    navigation.replace('ForgotPasswordVerify', { phoneNumber, countryCode });
  };

  const isFormValid = PHONE_REGEX.test(phone.trim());

  return (
    <FormScreenLayout
      header={
        <ForgotPasswordHeader
          title={t('forgotPassword.request.heading')}
          subtitle={t('forgotPassword.request.instruction')}
          onBack={() => navigation.goBack()}
        />
      }
      contentStyle={styles.content}
    >
      {/* MOBILE NUMBER — uppercase field label (Figma) */}
      <Text style={[styles.fieldLabel, { fontSize: fs('label') }]}>
        {t('forgotPassword.request.phoneLabel')}
      </Text>

      {/* ── Country picker + phone input row ── */}
      <View style={styles.phoneRow}>
        <View
          style={[
            styles.countryCard,
            { borderRadius: cornerRadius },
            isTablet && { paddingHorizontal: scale(14) },
          ]}
        >
          <Text style={styles.flag}>{clientConfig.phone.flag}</Text>
          <Text style={[styles.countryCode, { fontSize: fs('input') }]}>
            {clientConfig.phone.dialCode}
          </Text>
          <View style={styles.countryChevron}>
            <AppIcon name="chevronDown" size={16} color={colors.darkGray} />
          </View>
        </View>

        <View style={styles.flex1}>
          <View
            style={[
              styles.phoneInputWrapper,
              { borderRadius: cornerRadius },
              !!error && styles.phoneInputError,
            ]}
          >
            <TextInput
              style={[styles.phoneInput, { fontSize: fs('input') }]}
              placeholder={t('forgotPassword.request.phonePlaceholder')}
              placeholderTextColor={colors.placeholder}
              value={phone}
              onChangeText={(text) => {
                setPhone(text.replace(/[^0-9]/g, ''));
                if (error) setError('');
              }}
              keyboardType="number-pad"
              maxLength={clientConfig.phone.numberLength}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>

          {!!error && (
            <Text style={[commonStyles.errorText, styles.errorText, { fontSize: fs('error') }]}>
              {error}
            </Text>
          )}
        </View>
      </View>

      <AppButton
        label={t('forgotPassword.request.submit')}
        onPress={handleContinue}
        disabled={!isFormValid || isSubmitting}
        style={styles.button}
      />
    </FormScreenLayout>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex1: { flex: 1 },

  content: {
    paddingTop: 40,
  },

  fieldLabel: {
    color: colors.fieldLabel,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: dimens.labelGap,
  },

  phoneRow: {
    flexDirection: 'row',
    alignItems:    'stretch',
    gap:           16,
  },

  button: {
    marginTop: 48,
  },

  countryCard: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    backgroundColor:   colors.inputBg,
    paddingHorizontal: 10,
    height:            dimens.inputHeight,
  },

  flag: {
    fontSize:    20,
    marginRight: 4,
  },

  countryCode: {
    color:      colors.textPrimary,
    fontWeight: '500',
  },

  countryChevron: {
    marginLeft: 2,
  },

  phoneInputWrapper: {
    flex:              1,
    borderWidth:       1,
    borderColor:       colors.inputBorder,
    backgroundColor:   colors.white,
    minHeight:         dimens.inputHeight,
    justifyContent:    'center',
    paddingHorizontal: 14,
  },

  phoneInputError: {
    borderColor: colors.error,
  },

  phoneInput: {
    color:      colors.textPrimary,
    padding:    0,
    fontFamily: 'Lato_400Regular',
  },

  errorText: {
    marginTop: 4,
  },
});
