import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { AppButton } from './AppButton';
import { AppIcon, DangerTriangleIcon } from './icons';
import { colors, spacing } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

/** `danger`: red triangle (Capture SOS); `warning`: orange circle (Save & Exit). */
export type ConfirmDialogTone = 'danger' | 'warning';

interface ConfirmDialogProps {
  visible: boolean;
  tone: ConfirmDialogTone;
  title: string;
  message: string;
  /** Optional highlighted line under the message (Figma's purple info banner). */
  note?: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** The ✕ and the device Back button; defaults to onCancel. */
  onClose?: () => void;
}

const TONE = {
  danger: { bg: colors.dialogDangerBg, icon: colors.timelineSos },
  warning: { bg: colors.dialogWarningBg, icon: colors.dialogWarningIcon },
} as const;

// Figma's rings around the badge: diameter as a multiple of the badge's, and colour.
const RINGS = [
  { scale: 2.25, color: colors.dialogRing1 },
  { scale: 3.4, color: colors.dialogRing2 },
  { scale: 4.6, color: colors.dialogRing3 },
  { scale: 5.75, color: colors.dialogRing4 },
] as const;

/**
 * The shared two-button confirmation (Figma "Modal": Capture SOS, Save & Exit) on React
 * Native `Modal`: tone badge with its rings, ✕, title, message, optional note, Cancel and
 * Confirm side by side. Sizes are provisional until the modal frame can be read in Figma.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  tone,
  title,
  message,
  note,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  onClose = onCancel,
}) => {
  const { t } = useTranslation();
  const { isTablet, scale } = useResponsive();
  const look = TONE[tone];
  const badge = isTablet ? scale(44) : 40;
  const iconSize = Math.round(badge * 0.5);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { maxWidth: isTablet ? scale(440) : 360, padding: isTablet ? scale(24) : 20 }]}>
          {/* Decorative rings behind the badge, clipped by the card. */}
          {RINGS.map((ring) => (
            <View
              key={ring.scale}
              pointerEvents="none"
              style={[styles.ring, ringBox(badge * ring.scale, ring.color, isTablet ? scale(24) : 20, badge)]}
            />
          ))}

          <View style={styles.topRow}>
            <View style={[styles.badge, { width: badge, height: badge, borderRadius: badge / 2, backgroundColor: look.bg }]}>
              {tone === 'danger' ? (
                <DangerTriangleIcon size={iconSize} color={look.icon} />
              ) : (
                <AppIcon name="dangerCircle" size={iconSize} color={look.icon} />
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('dialog.a11y.close')}
              hitSlop={12}
            >
              <AppIcon name="close" size={isTablet ? scale(22) : 20} color={colors.dialogCloseIcon} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { fontSize: isTablet ? scale(22) : 18 }]}>{title}</Text>
          <Text style={[styles.message, { fontSize: isTablet ? scale(15) : 14 }]}>{message}</Text>

          {note && (
            <View style={styles.note}>
              <AppIcon name="infoCircle" size={isTablet ? scale(18) : 16} color={colors.primary} />
              <Text style={[styles.noteText, { fontSize: isTablet ? scale(14) : 13 }]}>{note}</Text>
            </View>
          )}

          <View style={styles.actions}>
            <View style={styles.flex1}>
              <AppButton label={cancelLabel} onPress={onCancel} variant="secondary" size="compact" />
            </View>
            <View style={styles.flex1}>
              <AppButton label={confirmLabel} onPress={onConfirm} size="compact" />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// A ring centred on the badge, which sits at the card's padding corner.
function ringBox(diameter: number, color: string, padding: number, badge: number) {
  const centre = padding + badge / 2;
  return {
    width: diameter,
    height: diameter,
    borderRadius: diameter / 2,
    borderColor: color,
    left: centre - diameter / 2,
    top: centre - diameter / 2,
  };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.dialogOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    color: colors.primaryTextFigma,
  },
  message: {
    color: colors.secondaryTextFigma,
    marginTop: spacing.xs,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.dialogNoteBorder,
    backgroundColor: colors.dialogNoteBg,
  },
  noteText: {
    flex: 1,
    color: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  flex1: {
    flex: 1,
  },
});
