import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { RootStackParamList } from '@/navigation/types';
import { PasswordField } from '@/features/auth/components/PasswordField';
import { LocationPickerModal, type FieldAnchor } from '@/features/auth/components/LocationPickerModal';
import { useLocationStore } from '@/features/auth/stores/location.store';
import {
  authFormStyles,
  LOGO_ASPECT,
  ILLUSTRATION_ASPECT,
} from '@/features/auth/components/authFormScreen.styles';
import { createSetupFormSchema, type SetupFormValues } from '@/features/auth/domain/setupForm.schema';
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

type Nav = NativeStackNavigationProp<RootStackParamList, 'Setup'>;

export const SetupScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { isTablet, fs, scale } = useResponsive();
  const login = useAuthStore(s => s.login);
  const locations = useLocationStore(s => s.locations);
  const isLocationsLoading = useLocationStore(s => s.isLoading);
  const fetchLocations = useLocationStore(s => s.fetchLocations);

  // Rules mirror SetupActivity.java attemptLogin() exactly — see
  // features/auth/domain/setupForm.schema.ts. Recreated only when the
  // translator changes (locale switch), not on every render.
  const schema = useMemo(() => createSetupFormSchema(t), [t]);
  const {
    control,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SetupFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { location: '', username: '', password: '' },
    // Validate only on submit — RHF's default reValidateMode ('onChange')
    // would re-run the resolver on every keystroke of an already-errored
    // field, live-updating its message. The original useState version only
    // ever cleared an error on type, never re-validated until the next
    // submit; pinning this keeps that exact behavior.
    reValidateMode: 'onSubmit',
  });

  const [banner, setBanner]                                 = useState<ErrorBanner | null>(null);
  const [isLocationPickerVisible, setLocationPickerVisible] = useState(false);
  const [locationAnchor, setLocationAnchor]                 = useState<FieldAnchor | null>(null);
  const [locationFieldY, setLocationFieldY]                 = useState<number | null>(null);
  const locationFieldRef = useRef<View>(null);

  // Anchors the dropdown to the field's actual on-screen position instead of
  // opening as a centered dialog.
  const openLocationPicker = () => {
    locationFieldRef.current?.measureInWindow((x, y, width, height) => {
      setLocationAnchor({ x, y, width, height });
      setLocationPickerVisible(true);
    });
  };

  // ── Location list — mirrors SetupActivity.getLocationFromServer(): fetched
  // once on mount and used to fill the LOCATION dropdown. ────────────────────
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await fetchLocations();
      // Every user sees this — the only user-facing feedback on failure.
      if (!cancelled && !result.ok) {
        showToast(t('setup.errors.locationsNotFetched'));
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot fetch on mount
  }, []);

  // ── Brand header — client wordmark (left) + illustration (absolute, top-right) ──
  // logoH is the visible glyph height now that setup_logo.png is pre-cropped
  // (no baked-in padding), so this can stay compact without looking tiny.
  const logoH = isTablet ? scale(46) : 32;
  const logoW = logoH * LOGO_ASPECT;
  const illustrationH = isTablet ? scale(130) : 104;
  const illustrationW = illustrationH * ILLUSTRATION_ASPECT;
  // Measured (not guessed) from the LOCATION field's actual onLayout position
  // — see locationFieldY below — so the illustration's bottom edge lands
  // exactly on the field's top border regardless of font metrics/locale.
  // null (not yet measured) falls back to 0 for one frame on first mount.
  // +1: onLayout's y and the field's rendered border round to the pixel
  // grid independently, which can leave a hairline gap — nudge the
  // illustration down 1dp so it overlaps the border instead of falling short.
  const illustrationTop = locationFieldY !== null ? locationFieldY - illustrationH + 1 : 0;
  // Inset from the right content edge, so the illustration doesn't sit flush
  // against it (per Figma).
  const illustrationRight = isTablet ? scale(20) : 14;

  // login() lives in the auth store, not this screen — it owns talking to
  // sessionApi, persisting tokens, and marking the store authenticated.
  // This screen only reacts to the result: a toast, or an error banner.
  const onValidSubmit = async (data: SetupFormValues) => {
    const result = await login(data.username, data.password);

    if (result.ok) {
      // Every user sees this — the only user-facing feedback on success.
      showToast(t('setup.toastSuccess'));
    } else {
      // Every user sees this — the only user-facing feedback on failure.
      // getApiErrorBanner() maps to a friendly, translated title/message;
      // never show result.error's kind/status/code/message directly to a
      // real user. Shared with LoginScreen — same auth-store login(), same
      // mapping, only the i18n namespace differs.
      setBanner(getApiErrorBanner(result.error, t, 'setup.errors'));
    }
  };

  // isSubmitting guard: PasswordField's onSubmitEditing (keyboard "done")
  // bypasses AppButton's disabled state, so re-entrance is blocked here too.
  const handleSetup = () => {
    if (isSubmitting) return;
    setBanner(null);
    void handleSubmit(onValidSubmit)();
  };

  return (
    <>
    <FormScreenLayout
      contentStyle={[styles.content, { paddingTop: isTablet ? scale(190) : 130 }]}
    >
      {/*
        ── Top section — logo, heading and the LOCATION field all sit in normal
        flow first; the illustration is the LAST child here (absolutely
        positioned, top-right) so it paints on top of them, matching Figma
        where it overlaps down onto the LOCATION field's top-right corner. ──
      */}
      <View style={styles.topSection}>
        <Image
          source={clientConfig.assets.setupLogo ?? clientConfig.assets.logo}
          style={{ width: logoW, height: logoH }}
          resizeMode="contain"
        />

        <Text style={[styles.title, { fontSize: fs('headerTitle') }]}>
          {t('setup.title')}
        </Text>
        <Text style={[styles.subtitle, { fontSize: fs('instruction'), lineHeight: Math.round(fs('instruction') * 1.3) }]}>
          {t('setup.subtitle')}
        </Text>

        {/* ── Location dropdown — reuses AppTextField in a read-only, tappable mode ── */}
        <Text
          style={[
            styles.fieldLabel,
            styles.firstFieldLabel,
            { fontSize: fs('label') - 1, marginTop: isTablet ? scale(36) : 28 },
          ]}
        >
          {t('setup.location')}
        </Text>
        <Controller
          control={control}
          name="location"
          render={({ field: { value } }) => (
            <TouchableOpacity
              ref={locationFieldRef}
              accessibilityRole="button"
              accessibilityLabel={t('setup.locationPlaceholder')}
              activeOpacity={0.7}
              onPress={openLocationPicker}
              onLayout={(e) => setLocationFieldY(e.nativeEvent.layout.y)}
            >
              <AppTextField
                value={value}
                placeholder={t('setup.locationPlaceholder')}
                editable={false}
                pointerEvents="none"
                error={errors.location?.message}
                leftSlot={<AppIcon name="locationPin" size={20} color={colors.icon} />}
                rightSlot={
                  isLocationsLoading
                    ? <ActivityIndicator size="small" color={colors.icon} />
                    : <AppIcon name="chevronDown" size={20} color={colors.icon} />
                }
              />
            </TouchableOpacity>
          )}
        />

        {/* pointerEvents="none" — this sits on top of the LOCATION field visually
            (per Figma) but must never swallow taps meant for it. */}
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

      {/* ── Username ── */}
      <Text style={[styles.fieldLabel, { fontSize: fs('label') - 1 }]}>
        {t('setup.username')}
      </Text>
      <Controller
        control={control}
        name="username"
        render={({ field: { value, onChange } }) => (
          <AppTextField
            placeholder={t('setup.usernamePlaceholder')}
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

      {/* ── Password ── */}
      <Text style={[styles.fieldLabel, { fontSize: fs('label') - 1 }]}>
        {t('setup.password')}
      </Text>
      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange } }) => (
          <PasswordField
            placeholder={t('setup.passwordPlaceholder')}
            value={value}
            onChangeText={(text) => {
              onChange(text);
              if (errors.password) clearErrors('password');
            }}
            error={errors.password?.message}
            leftSlot={<AppIcon name="lock" size={20} color={colors.icon} />}
            returnKeyType="done"
            onSubmitEditing={handleSetup}
          />
        )}
      />

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

      {/* TEMPORARY — dev/QA nav shortcut to LoginScreen, since there's no
          in-app path to it otherwise (Setup vs Login is chosen by app logic,
          not user navigation). Remove once no longer needed for testing. */}
      <TouchableOpacity
        style={styles.tempLoginRow}
        accessibilityRole="link"
        accessibilityLabel={t('setup.tempNavLogin')}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={[styles.tempLoginText, { fontSize: fs('link') }]}>
          {t('setup.tempNavLogin')}
        </Text>
      </TouchableOpacity>

      {/* ── API error banner — credentials/network/server failures from handleSetup ── */}
      {!!banner && <ApiErrorBanner banner={banner} />}

      {/* ── Login button — always enabled; the zod resolver surfaces per-field
          errors when tapped with empty/invalid fields. ── */}
      <AppButton
        label={t('setup.submit')}
        onPress={handleSetup}
        disabled={isSubmitting}
        style={styles.loginButton}
      />
    </FormScreenLayout>

    <LocationPickerModal
      visible={isLocationPickerVisible}
      locations={locations}
      isLoading={isLocationsLoading}
      anchor={locationAnchor}
      onSelect={(location) => {
        setValue('location', location.display, { shouldValidate: false });
        clearErrors('location');
        setLocationPickerVisible(false);
      }}
      onClose={() => setLocationPickerVisible(false)}
    />
    </>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
// Everything but the dev/QA temp-nav row is shared with LoginScreen — see
// authFormScreen.styles.ts.
const localStyles = StyleSheet.create({
  // TEMPORARY — see the dev/QA nav shortcut comment above.
  tempLoginRow: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },

  tempLoginText: {
    color:              colors.textSecondary,
    textDecorationLine: 'underline',
  },
});

const styles = { ...authFormStyles, ...localStyles };
