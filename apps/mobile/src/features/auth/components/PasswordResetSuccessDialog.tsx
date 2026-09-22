import React from 'react';
import { Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/core/ui/AppButton';
import { AppIcon } from '@/core/ui/icons';
import { Text } from '@/core/ui/Text';
import { colors } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

/**
 * "Password reset successful" popup — same Modal + backdrop + white-card
 * structure as core/ui/PermissionDeniedDialog.tsx (the app's only other
 * dialog), simplified to a single icon + heading + message + button.
 */

interface Props {
  visible: boolean;
  onBackToLogin: () => void;
}

export const PasswordResetSuccessDialog: React.FC<Props> = ({ visible, onBackToLogin }) => {
  const { t } = useTranslation();
  const { cornerRadius } = useResponsive();

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

          <View style={styles.iconCircle}>
            <AppIcon name="check" size={28} color={colors.white} />
          </View>

          <Text style={styles.title}>{t('forgotPassword.reset.success.title')}</Text>
          <Text style={styles.message}>{t('forgotPassword.reset.success.message')}</Text>

          <AppButton
            label={t('forgotPassword.reset.success.button')}
            onPress={onBackToLogin}
            style={styles.button}
          />
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
    alignItems: 'center',
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

  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },

  message: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: 20,
  },

  button: {
    width: '100%',
  },
});
