import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import type { RootStackParamList } from '@/navigation/types';
import { PasswordField } from '@/components/auth/PasswordField';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextField } from '@/components/ui/AppTextField';
import { FormScreenLayout } from '@/components/ui/FormScreenLayout';
import { AppIcon, wavePaths } from '@/components/ui/icons';
import { commonStyles } from '@/components/ui/commonStyles';
import { colors, dimens } from '@/config/theme';
import { useResponsive } from '@/hooks/useResponsive';

// Parent container padding — setup screen uses 30dp
const FORM_H_PAD = 30;

type Nav = NativeStackNavigationProp<RootStackParamList, 'Setup'>;
type FormErrors = { location?: string; username?: string; password?: string };

export const SetupScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { width, isTablet, fs, cornerRadius } = useResponsive();

  const [selectedLocation, setSelectedLocation] = useState('');
  const [username, setUsername]                 = useState('');
  const [password, setPassword]                 = useState('');
  const [errors, setErrors]                     = useState<FormErrors>({});

  // Header layout is intentionally separate from WaveHeader: no back button,
  // bottom-aligned text, larger tablet title (setup_top_vector.xml).
  const headerH   = width * (368 / 800);
  const titleSize = isTablet ? 36 : 18;

  // ── Validation — mirrors SetupActivity.java attemptLogin() ───────────────────
  const validate = (): boolean => {
    const next: FormErrors = {};

    // 1. Location — error_location_not_selected
    if (!selectedLocation) {
      next.location = t('setup.errors.locationRequired');
    }
    // 2. Username — error_require_email (format check always passes in Android)
    if (!username.trim()) {
      next.username = t('setup.errors.usernameRequired');
    }
    // 3. Password — empty then length (isPasswordValid: length > 7)
    if (!password) {
      next.password = t('setup.errors.passwordRequired');
    } else if (password.length <= 7) {
      next.password = t('setup.errors.passwordTooShort');
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSetup = () => {
    if (!validate()) return;
    // TODO: call setup API — navigate to Login on success
    navigation.navigate('Login');
  };

  const isFormValid =
    !!selectedLocation && !!username.trim() && password.length > 7;

  return (
    <FormScreenLayout
      header={
        <View style={[styles.header, { height: headerH }]}>
          <Svg
            viewBox={wavePaths.headerTop.viewBox}
            preserveAspectRatio="none"
            width={width}
            height={headerH}
            style={StyleSheet.absoluteFill}
          >
            <Path d={wavePaths.headerTop.d} fill={colors.wavePink} fillOpacity={0.39} />
          </Svg>

          <View style={styles.headerTextBox}>
            <Text style={[styles.headerTitle, { fontSize: titleSize }]}>
              {t('setup.title')}
            </Text>
            <Text style={styles.headerSubtitle}>{t('setup.subtitle')}</Text>
          </View>
        </View>
      }
      contentStyle={styles.content}
    >
      {/* ── Location dropdown — custom trigger row, styled like AppTextField ── */}
      <Text style={[styles.label, { fontSize: fs('label') }]}>
        {t('setup.location')}
      </Text>
      <TouchableOpacity
        style={[
          styles.dropdownRow,
          { borderRadius: cornerRadius },
          !!errors.location && styles.dropdownRowError,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('setup.locationPlaceholder')}
        activeOpacity={0.7}
        onPress={() => {
          // TODO: open real location picker
          // Simulating a selection to unblock validation during development
          setSelectedLocation('Demo Location');
          clearError('location');
        }}
      >
        <Text
          style={[
            styles.dropdownText,
            { fontSize: fs('input') },
            !selectedLocation && styles.dropdownPlaceholder,
          ]}
        >
          {selectedLocation || t('setup.locationPlaceholder')}
        </Text>
        <AppIcon name="chevronDown" size={20} color={colors.icon} />
      </TouchableOpacity>
      {!!errors.location && (
        <Text style={[commonStyles.errorText, styles.errorText, { fontSize: fs('error') }]}>
          {errors.location}
        </Text>
      )}

      {/* ── Username ── */}
      <AppTextField
        label={t('setup.username')}
        placeholder={t('setup.usernamePlaceholder')}
        value={username}
        onChangeText={(text) => { setUsername(text); clearError('username'); }}
        error={errors.username}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        containerStyle={commonStyles.fieldGap}
      />

      {/* ── Password ── */}
      <View style={commonStyles.fieldGap}>
        <PasswordField
          label={t('setup.password')}
          placeholder={t('setup.passwordPlaceholder')}
          value={password}
          onChangeText={(text) => { setPassword(text); clearError('password'); }}
          error={errors.password}
          returnKeyType="done"
          onSubmitEditing={handleSetup}
        />
      </View>

      {/* ── Forgot Password ── */}
      <TouchableOpacity
        style={styles.forgotRow}
        accessibilityRole="link"
        accessibilityLabel={t('setup.forgotPassword')}
        onPress={() => navigation.navigate('ForgotPasswordRequest')}
      >
        <Text style={[styles.forgotText, { fontSize: fs('link') }]}>
          {t('setup.forgotPassword')}
        </Text>
      </TouchableOpacity>

      {/* ── Login (temp nav shortcut) ── */}
      <TouchableOpacity
        style={styles.loginRow}
        accessibilityRole="link"
        accessibilityLabel={t('setup.tempNavLogin')}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={[commonStyles.link, { fontSize: fs('link') }]}>
          {t('setup.tempNavLogin')}
        </Text>
      </TouchableOpacity>

      {/* ── Privacy Notice (temp nav shortcut) ── */}
      <TouchableOpacity
        style={styles.privacyRow}
        accessibilityRole="link"
        accessibilityLabel={t('setup.tempNavPrivacy')}
        onPress={() => navigation.navigate('PrivacyNotice')}
      >
        <Text style={[commonStyles.link, { fontSize: fs('link') }]}>
          {t('setup.tempNavPrivacy')}
        </Text>
      </TouchableOpacity>

      {/* ── Setup button ── */}
      <AppButton
        label={t('setup.submit')}
        onPress={handleSetup}
        disabled={!isFormValid}
        showArrow
      />
    </FormScreenLayout>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // ── Header (separate from WaveHeader by design) ───────────────────────────
  header: {
    width:           '100%',
    backgroundColor: colors.white,
    overflow:        'hidden',
    justifyContent:  'flex-end',
    paddingBottom:   50,
  },

  headerTextBox: {
    paddingHorizontal: FORM_H_PAD,
    paddingBottom:     22,
  },

  headerTitle: {
    color:      colors.textPrimary,
    fontWeight: '700',
  },

  headerSubtitle: {
    color:      colors.textPrimary,
    fontSize:   14,
    marginTop:  6,
    lineHeight: 20,
  },

  // ── Form ──────────────────────────────────────────────────────────────────
  content: {
    paddingTop:        72,
    paddingHorizontal: FORM_H_PAD,
  },

  label: {
    color:        colors.textPrimary,
    fontWeight:   '500',
    marginBottom: dimens.labelGap,
  },

  // Dropdown trigger — styled like the shared input row
  dropdownRow: {
    height:            dimens.inputHeight,
    backgroundColor:   colors.inputBg,
    borderWidth:       1,
    borderColor:       colors.inputBorder,
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 14,
  },

  dropdownRowError: {
    borderColor: colors.error,
  },

  dropdownText: {
    flex:  1,
    color: colors.textPrimary,
  },

  dropdownPlaceholder: {
    color: colors.placeholder,
  },

  errorText: {
    marginTop: 4,  // RightAlignErrorTextInputLayout — error sits at the right edge
  },

  // ── Links ─────────────────────────────────────────────────────────────────
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 10,
  },

  forgotText: {
    color:              colors.colorForgotPassword,
    textDecorationLine: 'underline',
  },

  // Temp nav shortcuts (Login / Privacy Notice)
  loginRow: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },

  privacyRow: {
    alignSelf:    'flex-start',
    marginTop:    8,
    marginBottom: 32,
  },
});
