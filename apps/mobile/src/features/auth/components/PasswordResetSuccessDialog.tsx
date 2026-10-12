import React from 'react';
import { Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Text } from '@/core/ui/Text';
import { colors, dimens } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

/**
 * "Password reset successful" popup — same Modal + backdrop + white-card
 * structure as core/ui/PermissionDeniedDialog.tsx (the app's only other
 * dialog), simplified to a single icon + heading + message + button.
 *
 * Icon and button colors are sampled directly from the reference screenshot
 * (Figma quota was exhausted when this was built, so no live export was
 * possible) — mint disc #CDFFE6 + outline check-circle #00A254, gradient
 * button #460094 → #5E00CD. Scoped to this one dialog: AppButton's shared
 * solid-fill style is untouched everywhere else.
 */

const ICON_BOX = 72;
const CHECK_COLOR = '#00A254';
const DISC_COLOR = '#CDFFE6';
const RIPPLE_COLOR = '#E5E5E5';
const BUTTON_GRADIENT: [string, string] = ['#460094', '#5E00CD'];

interface Props {
  visible: boolean;
  onBackToLogin: () => void;
}

export const PasswordResetSuccessDialog: React.FC<Props> = ({ visible, onBackToLogin }) => {
  const { t } = useTranslation();
  const { isTablet, fs, cornerRadius } = useResponsive();
  const buttonHeight = isTablet ? dimens.buttonHeight.tablet : dimens.buttonHeight.phone;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onBackToLogin}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { borderRadius: cornerRadius }]}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onBackToLogin}
            accessibilityRole="button"
            accessibilityLabel={t('common.a11y.close')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.closeGlyph}>×</Text>
          </TouchableOpacity>

          {/* Faint ripple rings behind a mint disc + outline check-circle. */}
          <Svg width={ICON_BOX} height={ICON_BOX} viewBox="0 0 96 96" style={styles.icon}>
            <Circle cx={48} cy={48} r={44} fill="none" stroke={RIPPLE_COLOR} strokeWidth={1} opacity={0.6} />
            <Circle cx={48} cy={48} r={34} fill="none" stroke={RIPPLE_COLOR} strokeWidth={1} opacity={0.8} />
            <Circle cx={48} cy={48} r={22} fill={DISC_COLOR} />
            <Circle cx={48} cy={48} r={15} fill="none" stroke={CHECK_COLOR} strokeWidth={2.2} />
            <Path
              d="M40.5 48.5 L45.5 53.5 L57 41"
              fill="none"
              stroke={CHECK_COLOR}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>

          <Text style={styles.title}>{t('forgotPassword.reset.success.title')}</Text>
          <Text style={styles.message}>{t('forgotPassword.reset.success.message')}</Text>

          <TouchableOpacity
            style={[styles.button, { height: buttonHeight, borderRadius: cornerRadius }]}
            onPress={onBackToLogin}
            accessibilityRole="button"
            accessibilityLabel={t('forgotPassword.reset.success.button')}
            activeOpacity={0.85}
          >
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="successBtnGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={BUTTON_GRADIENT[0]} />
                  <Stop offset="1" stopColor={BUTTON_GRADIENT[1]} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" rx={cornerRadius} fill="url(#successBtnGrad)" />
            </Svg>
            <Text style={[styles.buttonLabel, { fontSize: fs('button') }]}>
              {t('forgotPassword.reset.success.button')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.dialogOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.white,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'flex-start',
    overflow: 'hidden',
    elevation: 8,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
    }),
  },

  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
  },

  closeGlyph: {
    fontSize: 20,
    lineHeight: 20,
    color: colors.darkGray,
  },

  icon: {
    marginTop: -10,
    marginLeft: -10,
    marginBottom: 2,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },

  message: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.darkGray,
    textAlign: 'left',
    marginBottom: 20,
  },

  button: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  buttonLabel: {
    color: colors.onPrimary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
