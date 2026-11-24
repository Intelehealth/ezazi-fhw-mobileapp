import React from 'react';
import { Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@/core/config/theme';
import { AppButton } from '@/core/ui/AppButton';
import { AppIcon } from '@/core/ui/icons';
import { Text } from '@/core/ui/Text';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

/**
 * "Close patient registration?" — raised by the header X on either step, and
 * by hardware back. A plain alert card: NO coloured header band, so it does
 * not reuse PermissionDeniedDialog's skeleton. Yes is the primary button even
 * though it is the destructive one — the legacy did the same, so it is carried.
 */
interface DiscardRegistrationDialogProps {
  visible: boolean;
  /** "Yes" — throws the draft and the captured photo away. */
  onConfirm: () => void;
  /** "No", the X, and hardware back. All three are the same answer. */
  onDismiss: () => void;
}

// This dialog has no Figma measurements behind it, so its glyph geometry is
// named here rather than pretending to be a measured theme token.
const GLYPH_SIZE = 24;
const GLYPH_CIRCLE = 44;
const GLYPH_HALO = 8;

export const DiscardRegistrationDialog: React.FC<DiscardRegistrationDialogProps> = ({
  visible,
  onConfirm,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const { fs, cornerRadius } = useResponsive();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { borderRadius: cornerRadius }]}>
          <View style={styles.topRow}>
            <View style={styles.glyphHalo}>
              <AppIcon name="warning" size={GLYPH_SIZE} color={colors.warning} />
            </View>

            <TouchableOpacity
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel={t('common.a11y.close')}
              hitSlop={spacing.sm}
            >
              <AppIcon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { fontSize: fs('heading') }]}>
            {t('patient.common.discard.title')}
          </Text>
          <Text style={[styles.body, { fontSize: fs('instruction') }]}>
            {t('patient.common.discard.body')}
          </Text>

          <View style={styles.footer}>
            <View style={styles.footerBtn}>
              <AppButton
                label={t('patient.common.discard.dismiss')}
                onPress={onDismiss}
                variant="outline"
              />
            </View>
            <View style={styles.footerBtn}>
              <AppButton label={t('patient.common.discard.confirm')} onPress={onConfirm} />
            </View>
          </View>
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
    paddingHorizontal: spacing.lg,
  },

  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.white,
    padding: spacing.lg,
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

  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  // The halo is a thick border rather than a second circle — one view, and
  // the ring stays concentric at any size.
  glyphHalo: {
    width: GLYPH_CIRCLE,
    height: GLYPH_CIRCLE,
    borderRadius: GLYPH_CIRCLE / 2,
    backgroundColor: colors.warningTint,
    borderWidth: GLYPH_HALO,
    borderColor: colors.warningHalo,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: spacing.md,
  },

  body: {
    color: colors.dialogText,
    marginTop: spacing.sm,
  },

  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  footerBtn: {
    flex: 1,
  },
});
