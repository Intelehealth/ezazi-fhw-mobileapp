import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import type { RootStackParamList } from '@/navigation/types';
import { PasswordField } from '@/components/auth/PasswordField';
import { AppButton } from '@/components/ui/AppButton';
import { AppTextField } from '@/components/ui/AppTextField';
import { wavePaths } from '@/components/ui/icons';
import { commonStyles } from '@/components/ui/commonStyles';
import { clientConfig } from '@/config/clients';
import { colors, dimens } from '@/config/theme';
import { useResponsive } from '@/hooks/useResponsive';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;
type FormErrors = { username?: string; password?: string };

export const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { width, isTablet, fs } = useResponsive();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState<FormErrors>({});

  // logo dimensions — per-client (dimens.xml); falls back to Nepal values
  const _loginSize = clientConfig.assets.logoSize?.login;
  const logoW         = _loginSize ? (isTablet ? _loginSize.tablet.width     : _loginSize.phone.width)     : (isTablet ? 340 : 300);
  const logoH         = _loginSize ? (isTablet ? _loginSize.tablet.height    : _loginSize.phone.height)    : (isTablet ? 340 : 280);
  const logoMarginTop  = _loginSize ? (isTablet ? (_loginSize.tablet.marginTop   ?? 0) : (_loginSize.phone.marginTop   ?? 0)) : 0;
  const formMarginTop  = _loginSize ? (isTablet ? (_loginSize.tablet.gapBelowIcon ?? 0) : (_loginSize.phone.gapBelowIcon ?? 0)) : 0;

  // Wave heights — drawables are 400dp wide, scale to screen width
  const lightWaveH = width * (175 / 400);
  const darkWaveH  = width * (109 / 400);

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!username.trim()) {
      next.username = t('login.errors.usernameRequired');
    }
    if (!password) {
      next.password = t('login.errors.passwordRequired');
    } else if (password.length < 8) {
      next.password = t('login.errors.passwordTooShort');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleLogin = () => {
    if (!validate()) return;
    // TODO: replace with authApi.login({ username, password })
    // On API success → navigate to PrivacyNotice (which calls setAuthenticated on Accept)
    navigation.navigate('PrivacyNotice');
  };

  const isFormValid = !!username.trim() && password.length >= 8;

  return (
    <View style={commonStyles.root}>

      {/* ── Bottom waves — absolutely at bottom, behind all content ── */}
      <View style={[styles.waveAbsolute, { height: lightWaveH }]}>
        <Svg
          viewBox={wavePaths.loginLight.viewBox}
          preserveAspectRatio="none"
          width={width}
          height={lightWaveH}
          style={StyleSheet.absoluteFillObject}
        >
          <Path d={wavePaths.loginLight.d} fill={colors.wavePink} fillOpacity={0.39} />
        </Svg>
      </View>

      <View style={[styles.waveAbsolute, { height: darkWaveH }]}>
        <Svg
          viewBox={wavePaths.loginDark.viewBox}
          preserveAspectRatio="none"
          width={width}
          height={darkWaveH}
          style={StyleSheet.absoluteFillObject}
        >
          <Path d={wavePaths.loginDark.d} fill={colors.wavePinkDark} fillOpacity={0.39} />
        </Svg>
      </View>

      {/* ── Form — scrollable content above waves ── */}
      <KeyboardAvoidingView
        style={commonStyles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={commonStyles.flex1}
          contentContainerStyle={{
            paddingHorizontal: dimens.screenHPad,
            paddingTop:        isTablet ? 40 : 72,
            paddingBottom:     lightWaveH + 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Client-branded logo — uses loginIcon if provided (e.g. eZAZI emblem), else logo */}
          <Image
            source={clientConfig.assets.loginIcon ?? clientConfig.assets.logo}
            style={[styles.logo, { width: logoW, height: logoH, marginTop: logoMarginTop }]}
            resizeMode="contain"
          />

          <AppTextField
            label={t('login.username')}
            placeholder={t('login.usernamePlaceholder')}
            value={username}
            onChangeText={(text) => { setUsername(text); clearError('username'); }}
            error={errors.username}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            containerStyle={[styles.usernameGap, formMarginTop > 0 && { marginTop: formMarginTop }]}
          />

          <View style={commonStyles.fieldGap}>
            <PasswordField
              label={t('login.password')}
              placeholder={t('login.passwordPlaceholder')}
              value={password}
              onChangeText={(text) => { setPassword(text); clearError('password'); }}
              error={errors.password}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          <AppButton
            label={t('login.submit')}
            onPress={handleLogin}
            disabled={!isFormValid}
            style={styles.loginBtnGap}
          />

          <TouchableOpacity
            style={styles.forgotRow}
            onPress={() => navigation.navigate('ForgotPasswordRequest')}
            accessibilityRole="link"
            accessibilityLabel={t('login.forgotPassword')}
          >
            <Text style={[commonStyles.link, { fontSize: fs('link') }]}>
              {t('login.forgotPassword')}
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  waveAbsolute: {
    position: 'absolute',
    bottom:   0,
    left:     0,
    right:    0,
  },

  logo: {
    alignSelf: 'center',
  },

  usernameGap: {
    marginTop: 28,
  },

  loginBtnGap: {
    marginTop: 44,
  },

  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 16,
  },

});
