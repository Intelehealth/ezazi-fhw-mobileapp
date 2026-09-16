import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { PermissionDeniedDialog } from '@/core/ui/PermissionDeniedDialog';
import { iconPaths, splashHills } from '@/core/ui/icons';
import { splashIllustration } from '@/core/ui/illustrations/splashIllustration';
import { clientConfig } from '@/core/config/clients';
import { colors } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { useAuthStore } from '@/core/session/auth.store';
import {
  checkAppPermissions,
  onAppForeground,
  openAppSettings,
  requestAppPermissions,
} from '@/core/utils/permissions';

// ─── Permission state ─────────────────────────────────────────────────────────

type PermState =
  | 'idle'            // not yet requested
  | 'requesting'      // system dialog open
  | 'granted'         // all permissions OK → bootstrap started
  | 'denied'          // at least one denied, can retry
  | 'never_ask_again' // at least one permanently denied → must go to Settings

// ─── Component ───────────────────────────────────────────────────────────────
export const SplashScreen: React.FC = () => {
  const { t } = useTranslation();
  const bootstrap = useAuthStore((s) => s.bootstrap);

  const [permState, setPermState] = useState<PermState>('idle');
  // Guard so bootstrap() is called exactly once even if requestPermissions is retried
  const bootstrapCalled = useRef(false);

  // ── Permission request ────────────────────────────────────────────────────
  const startBootstrap = useCallback(() => {
    if (!bootstrapCalled.current) {
      bootstrapCalled.current = true;
      // bootstrap() always calls set() — either success or catch branch.
      // Use void intentionally: status update is handled inside the store.
      void bootstrap();
    }
  }, [bootstrap]);

  const requestPermissions = useCallback(async () => {
    setPermState('requesting');
    try {
      const result = await requestAppPermissions();

      if (result === 'granted') {
        setPermState('granted');
        startBootstrap();
      } else if (result === 'never_ask_again') {
        setPermState('never_ask_again');
      } else {
        setPermState('denied');
      }
    } catch {
      // PermissionsAndroid.requestMultiple can throw in rare cases
      // (e.g. called from background, device-specific API errors).
      // Treat as granted so the app is never permanently stuck.
      setPermState('granted');
      startBootstrap();
    }
  }, [startBootstrap]);

  // ── Check permissions when returning from the Settings app ───────────────
  const checkAfterSettings = useCallback(async () => {
    if (permState !== 'never_ask_again') return;
    try {
      const result = await checkAppPermissions();
      if (result === 'granted') {
        setPermState('granted');
        startBootstrap();
      }
      // still denied → dialog stays visible
    } catch {
      // treat check error as granted (unblock the app)
      setPermState('granted');
      startBootstrap();
    }
  }, [permState, startBootstrap]);

  // ── Kick off permission request on mount ─────────────────────────────────
  useEffect(() => {
    void requestPermissions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Subscribe to app-foreground event (user returns from Settings) ────────
  useEffect(() => {
    if (permState !== 'never_ask_again') return;
    const unsubscribe = onAppForeground(() => void checkAfterSettings());
    return unsubscribe;
  }, [permState, checkAfterSettings]);

  // ── Hardware back-button: exit app when dialog is showing ─────────────────
  useEffect(() => {
    if (permState !== 'denied' && permState !== 'never_ask_again') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });
    return () => sub.remove();
  }, [permState]);

  // ─────────────────────────────────────────────────────────────────────────

  const { width, isTablet } = useResponsive();

  // ── Bottom hills — stretched to screen width, same convention as the old
  // wavePaths (preserveAspectRatio="none"); front layer taller, drawn on top ──
  const HILL_BACK_H  = width * (281 / 800);
  const HILL_FRONT_H = width * (317 / 800);

  // ── Wordmark — clients with a dedicated dark-background asset
  // (assets.splashLogo) use it as-is; others fall back to their normal logo
  // untinted, since not every client's mark is a flat-color image tinting
  // could recolor cleanly (e.g. Nepal's is a multi-color crest) ──
  const WORDMARK_W = isTablet ? 200 : 140;
  const WORDMARK_H = isTablet ? 84  : 60;

  // ── Illustration — sized by height only so its (taller-than-square) aspect
  // ratio isn't distorted; shared by both clients (see splashIllustration.ts) ──
  const ILLUSTRATION_ASPECT = 299 / 419; // splashIllustration.viewBox
  const ILLUSTRATION_H = isTablet ? 340 : 230;
  const ILLUSTRATION_W = ILLUSTRATION_H * ILLUSTRATION_ASPECT;

  const dialogVisible = permState === 'denied' || permState === 'never_ask_again';

  return (
    <View style={styles.root}>

      {/* ── Top — client wordmark, tagline, divider ── */}
      <View style={[styles.topSection, { marginTop: isTablet ? 96 : 64 }]}>
        <Image
          source={clientConfig.assets.splashLogo ?? clientConfig.assets.logo}
          style={{ width: WORDMARK_W, height: WORDMARK_H }}
          resizeMode="contain"
        />

        <Text style={[styles.tagline, { fontSize: isTablet ? 13 : 11 }]}>
          {t('splash.tagline')}
        </Text>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Svg width={12} height={12} viewBox="0 0 24 24" style={styles.dividerHeart}>
            <Path d={iconPaths.heart} fill={colors.colorAccent} />
          </Svg>
          <View style={styles.dividerLine} />
        </View>
      </View>

      {/* ── Bottom hills — behind the illustration, declared first ── */}
      <View style={[styles.hillContainer, { height: HILL_FRONT_H }]}>
        <Svg
          viewBox={splashHills.back.viewBox}
          preserveAspectRatio="none"
          width={width}
          height={HILL_BACK_H}
          style={[StyleSheet.absoluteFill, { top: HILL_FRONT_H - HILL_BACK_H }]}
        >
          <Defs>
            <LinearGradient id="hillBack" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={splashHills.back.gradient[0]} />
              <Stop offset="1" stopColor={splashHills.back.gradient[1]} />
            </LinearGradient>
          </Defs>
          <Path d={splashHills.back.d} fill="url(#hillBack)" fillOpacity={splashHills.back.fillOpacity} />
        </Svg>

        <Svg
          viewBox={splashHills.front.viewBox}
          preserveAspectRatio="none"
          width={width}
          height={HILL_FRONT_H}
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <LinearGradient id="hillFront" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={splashHills.front.gradient[0]} />
              <Stop offset="1" stopColor={splashHills.front.gradient[1]} />
            </LinearGradient>
          </Defs>
          <Path d={splashHills.front.d} fill="url(#hillFront)" />
        </Svg>
      </View>

      {/* ── Illustration — shared across clients ── */}
      <View style={[styles.illustrationSection, { paddingBottom: HILL_FRONT_H * 0.15 }]}>
        <Svg viewBox={splashIllustration.viewBox} width={ILLUSTRATION_W} height={ILLUSTRATION_H}>
          {splashIllustration.paths.map((path, index) => (
            <Path key={index} d={path.d} fill={path.fill} />
          ))}
        </Svg>
      </View>

      {/* ── Bottom — loading indicator ── */}
      <View style={[styles.bottomSection, { marginBottom: isTablet ? 48 : 32 }]}>
        <ActivityIndicator size="small" color={colors.onPrimary} />
        <Text style={styles.loadingText}>
          {t('splash.loading', { client: clientConfig.displayName })}
        </Text>
      </View>

      {/* ── Permission denied dialog — rendered on top of splash ── */}
      <PermissionDeniedDialog
        visible={dialogVisible}
        isPermanentlyDenied={permState === 'never_ask_again'}
        onRetry={requestPermissions}
        onOpenSettings={openAppSettings}
        onClose={() => BackHandler.exitApp()}
      />

    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },

  topSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  tagline: {
    color: colors.onPrimary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    lineHeight: 18,
    marginTop: 12,
    opacity: 0.85,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },

  dividerLine: {
    width: 32,
    height: 1,
    backgroundColor: colors.onPrimary,
    opacity: 0.35,
  },

  dividerHeart: {
    marginHorizontal: 8,
  },

  hillContainer: {
    position: 'absolute',
    bottom: 0,
    left:    0,
    right:   0,
  },

  illustrationSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  bottomSection: {
    alignItems: 'center',
  },

  loadingText: {
    color: colors.onPrimary,
    fontSize: 12,
    marginTop: 8,
    opacity: 0.85,
  },
});
