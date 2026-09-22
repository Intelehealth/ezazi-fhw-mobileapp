import React, { useMemo, useState } from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { RootStackParamList } from '@/navigation/types';
import { PasswordField } from '@/features/auth/components/PasswordField';
import {
  authFormStyles as styles,
  LOGO_ASPECT,
  ILLUSTRATION_ASPECT,
} from '@/features/auth/components/authFormScreen.styles';
import { createLoginFormSchema, type LoginFormValues } from '@/features/auth/domain/loginForm.schema';
import { ApiErrorBanner } from '@/core/ui/ApiErrorBanner';
import { AppButton } from '@/core/ui/AppButton';
import { AppTextField } from '@/core/ui/AppTextField';
import { FormScreenLayout } from '@/core/ui/FormScreenLayout';
import { AppIcon } from '@/core/ui/icons';
import { Text } from '@/core/ui/Text';
import { setupIllustration } from '@/core/ui/illustrations/setupIllustration';
import { clientConfig } from '@/core/config/clients';
import { colors } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { useAuthStore } from '@/core/session/auth.store';
import { showToast } from '@/core/utils/toast';
import { getApiErrorBanner, type ErrorBanner } from '@/core/utils/apiErrorBanner';

/**
 * Same layout/tokens as SetupScreen — Figma calls for an identical screen,
 * minus the LOCATION field (this is the subsequent-login screen, not the
 * one-time device setup). Shared layout constants + styles live in
 * authFormScreen.styles.ts — one source of truth, not two copies.
 *
 * login() and the API-error → banner mapping (getApiErrorBanner) are shared
 * with SetupScreen — same auth-store action, same error copy, only the
 * i18n namespace ('login.errors' vs 'setup.errors') differs.
 */

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { isTablet, fs, scale } = useResponsive();
  const login = useAuthStore(s => s.login);

  // Rules mirror LoginActivity's username/password checks — see
  // features/auth/domain/loginForm.schema.ts (shared shape with SetupScreen,
  // only the i18n namespace differs). Recreated only on locale change.
  const schema = useMemo(() => createLoginFormSchema(t), [t]);
  const {
    control,
    handleSubmit,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
    // Validate only on submit — RHF's default reValidateMode ('onChange')
    // would re-run the resolver on every keystroke of an already-errored
    // field, live-updating its message. The original useState version only
    // ever cleared an error on type, never re-validated until the next
    // submit; pinning this keeps that exact behavior.
    reValidateMode: 'onSubmit',
  });

  const [banner, setBanner]             = useState<ErrorBanner | null>(null);
  const [usernameFieldY, setUsernameFieldY] = useState<number | null>(null);

  // ── Brand header — client wordmark (left) + illustration (absolute, top-right) ──
  // logoH is the visible glyph height now that setup_logo.png is pre-cropped
  // (no baked-in padding), so this can stay compact without looking tiny.
  const logoH = isTablet ? scale(46) : 32;
  const logoW = logoH * LOGO_ASPECT;
  const illustrationH = isTablet ? scale(130) : 104;
  const illustrationW = illustrationH * ILLUSTRATION_ASPECT;
  // Measured (not guessed) from the USERNAME field's actual onLayout position
  // — see usernameFieldY below — so the illustration's bottom edge lands
  // exactly on the field's top border regardless of font metrics/locale.
  // null (not yet measured) falls back to 0 for one frame on first mount.
  // +1: onLayout's y and the field's rendered border round to the pixel
  // grid independently, which can leave a hairline gap — nudge the
  // illustration down 1dp so it overlaps the border instead of falling short.
  const illustrationTop = usernameFieldY !== null ? usernameFieldY - illustrationH + 1 : 0;
  // Inset from the right content edge, so the illustration doesn't sit flush
  // against it (per Figma).
  const illustrationRight = isTablet ? scale(20) : 14;

  // login() lives in the auth store, not this screen — it owns talking to
  // sessionApi, persisting tokens, and marking the store authenticated.
  // This screen only reacts to the result: a toast, or an error banner.
  // RootNavigator swaps to the authenticated stack on its own once the
  // store's status flips — no explicit navigation needed here.
  const onValidSubmit = async (data: LoginFormValues) => {
    const result = await login(data.username, data.password);

    if (result.ok) {
      // Every user sees this — the only user-facing feedback on success.
      showToast(t('login.toastSuccess'));
    } else {
      // Every user sees this — the only user-facing feedback on failure.
      // getApiErrorBanner() maps to a friendly, translated title/message;
      // never show result.error's kind/status/code/message directly to a
      // real user. Shared with SetupScreen — same auth-store login(), same
      // mapping, only the i18n namespace differs.
      setBanner(getApiErrorBanner(result.error, t, 'login.errors'));
    }
  };

  // isSubmitting guard: PasswordField's onSubmitEditing (keyboard "done")
  // bypasses AppButton's disabled state, so re-entrance is blocked here too.
  const handleLogin = () => {
    if (isSubmitting) return;
    setBanner(null);
    void handleSubmit(onValidSubmit)();
  };

  return (
    <FormScreenLayout
      contentStyle={[styles.content, { paddingTop: isTablet ? scale(190) : 130 }]}
    >
      {/*
        ── Top section — logo, heading and the USERNAME field all sit in
        normal flow first; the illustration is the LAST child here (absolutely
        positioned, top-right) so it paints on top of them, matching Figma
        where it overlaps down onto the USERNAME field's top-right corner. ──
      */}
      <View style={styles.topSection}>
        <Image
          source={clientConfig.assets.setupLogo ?? clientConfig.assets.logo}
          style={{ width: logoW, height: logoH }}
          resizeMode="contain"
        />

        <Text style={[styles.title, { fontSize: fs('headerTitle') }]}>
          {t('login.title')}
        </Text>
        <Text style={[styles.subtitle, { fontSize: fs('instruction'), lineHeight: Math.round(fs('instruction') * 1.3) }]}>
          {t('login.subtitle')}
        </Text>

        {/* ── Username ── */}
        <Text
          style={[
            styles.fieldLabel,
            styles.firstFieldLabel,
            { fontSize: fs('label') - 1, marginTop: isTablet ? scale(36) : 28 },
          ]}
        >
          {t('login.username')}
        </Text>
        <View onLayout={(e) => setUsernameFieldY(e.nativeEvent.layout.y)}>
          <Controller
            control={control}
            name="username"
            render={({ field: { value, onChange } }) => (
              <AppTextField
                placeholder={t('login.usernamePlaceholder')}
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  if (errors.username) clearErrors('username');
                }}
                error={errors.username?.message}
                leftSlot={<AppIcon name="person" size={20} color={colors.icon} />}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            )}
          />
        </View>

        {/* pointerEvents="none" — this sits on top of the USERNAME field
            visually (per Figma) but must never swallow taps meant for it. */}
        <Svg
          viewBox={setupIllustration.viewBox}
          width={illustrationW}
          height={illustrationH}
          style={[styles.illustration, { top: illustrationTop, right: illustrationRight }]}
          pointerEvents="none"
        >
          {setupIllustration.paths.map((path, index) => (
            <Path key={index} d={path.d} fill={path.fill} />
          ))}
        </Svg>
      </View>

      {/* ── Password ── */}
      <Text style={[styles.fieldLabel, { fontSize: fs('label') - 1 }]}>
        {t('login.password')}
      </Text>
      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange } }) => (
          <PasswordField
            placeholder={t('login.passwordPlaceholder')}
            value={value}
            onChangeText={(text) => {
              onChange(text);
              if (errors.password) clearErrors('password');
            }}
            error={errors.password?.message}
            leftSlot={<AppIcon name="lock" size={20} color={colors.icon} />}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
        )}
      />

      {/* ── Forgot Password ── */}
      <TouchableOpacity
        style={styles.forgotRow}
        accessibilityRole="link"
        accessibilityLabel={t('login.forgotPassword')}
        onPress={() => navigation.navigate('ForgotPasswordRequest')}
      >
        <Text style={[styles.forgotText, { fontSize: fs('link') }]}>
          {t('login.forgotPassword')}
        </Text>
      </TouchableOpacity>

      {/* ── API error banner — credentials/network/server failures from handleLogin ── */}
      {!!banner && <ApiErrorBanner banner={banner} />}

      {/* ── Login button — always enabled; the zod resolver surfaces per-field
          errors when tapped with empty/invalid fields. ── */}
      <AppButton
        label={t('login.submit')}
        onPress={handleLogin}
        disabled={isSubmitting}
        style={styles.loginButton}
      />
    </FormScreenLayout>
  );
};
