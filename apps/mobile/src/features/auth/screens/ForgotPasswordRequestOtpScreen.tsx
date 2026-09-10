import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { WaveHeader } from '@/features/auth/components/WaveHeader';
import { AppButton } from '@/core/ui/AppButton';
import { FormScreenLayout } from '@/core/ui/FormScreenLayout';
import { AppIcon } from '@/core/ui/icons';
import { commonStyles } from '@/core/ui/commonStyles';
import { clientConfig } from '@/core/config/clients';
import { colors, dimens } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

const PHONE_REGEX = new RegExp(`^\\d{${clientConfig.phone.numberLength}}$`);

type Nav = NativeStackNavigationProp<RootStackParamList, 'ForgotPasswordRequest'>;

export const ForgotPasswordRequestOtpScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { isTablet, fs, cornerRadius } = useResponsive();

  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

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

  const handleContinue = () => {
    if (!validate()) return;
    navigation.navigate('ForgotPasswordVerify', {
      phone: `${clientConfig.phone.dialCode}${phone.trim()}`,
    });
  };

  const isFormValid = PHONE_REGEX.test(phone.trim());

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
          label={t('forgotPassword.request.submit')}
          onPress={handleContinue}
          disabled={!isFormValid}
          showArrow
        />
      }
      contentStyle={styles.content}
    >
      <Text style={[commonStyles.fieldHeading, styles.heading, { fontSize: fs('heading') }]}>
        {t('forgotPassword.request.heading')}
      </Text>

      <Text style={[commonStyles.instruction, styles.instruction, { fontSize: fs('instruction') }]}>
        {t('forgotPassword.request.instruction')}
      </Text>

      {/* ── Country picker + phone input row ── */}
      <View style={styles.phoneRow}>
        <View
          style={[
            styles.countryCard,
            { borderRadius: cornerRadius },
            isTablet && { paddingHorizontal: 14 },
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
    </FormScreenLayout>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex1: { flex: 1 },

  content: {
    paddingTop: 70,
  },

  heading: {
    marginBottom: 8,
  },

  instruction: {
    marginBottom: 8,
  },

  phoneRow: {
    flexDirection: 'row',
    alignItems:    'stretch',
    gap:           16,
    marginTop:     4,
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
    color:   colors.textPrimary,
    padding: 0,
  },

  errorText: {
    marginTop: 4,
  },
});
