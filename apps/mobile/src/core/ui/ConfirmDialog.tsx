import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { AppButton } from './AppButton';
import { AppIcon, CheckCircleIcon, DangerTriangleIcon } from './icons';
import { colors, dimens, radii, spacing } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

/** `danger`: red triangle (Capture SOS); `warning`: orange circle (Save & Exit); `success`: green check-circle. */
export type ConfirmDialogTone = 'danger' | 'warning' | 'success';

interface ConfirmDialogProps {
  visible: boolean;
  tone: ConfirmDialogTone;
  title: string;
  message: string;
  /** Content under the message, e.g. a list (UI_CONVENTIONS §5). */
  children?: React.ReactNode;
  /** Optional highlighted line under the message (Figma's purple info banner). */
  note?: string;
  /** Without a cancel label and handler the dialog has one button and no ✕ (a blocking gate). */
  cancelLabel?: string;
  confirmLabel: string;
  onCancel?: () => void;
  onConfirm: () => void;
  /** The ✕ and the device Back button; defaults to onCancel. */
  onClose?: () => void;
  /** A gate: no ✕; the device Back button still calls onClose. */
  hideClose?: boolean;
  /** Screen-reader names for the buttons when their labels alone are too short. */
  cancelAccessibilityLabel?: string;
  confirmAccessibilityLabel?: string;
  /** QA locator; its parts get `-close`, `-cancel` and `-confirm`. */
  testID?: string;
}

const TONE = {
  danger: { bg: colors.dialogDangerBg, icon: colors.timelineSos },
  warning: { bg: colors.dialogWarningBg, icon: colors.dialogWarningIcon },
  success: { bg: colors.dialogSuccessBg, icon: colors.dialogSuccessIcon },
} as const;

// Figma's rings around the badge: diameter as a multiple of the badge's, and colour.
const RINGS = [
  { scale: 2.25, color: colors.dialogRing1 },
  { scale: 3.4, color: colors.dialogRing2 },
  { scale: 4.6, color: colors.dialogRing3 },
  { scale: 5.75, color: colors.dialogRing4 },
] as const;

/**
 * Every app dialog (Figma "Modal", UI_CONVENTIONS §5) on React Native `Modal`: tone badge with its rings, ✕,
 * title, message, optional content and note, then Cancel and the gradient Confirm side by side, or Confirm alone.
 * Dialogs Figma does not draw (low battery, permissions) use it too, so every dialog looks the same.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  tone,
  title,
  message,
  children,
  note,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  onClose = onCancel,
  hideClose = false,
  cancelAccessibilityLabel,
  confirmAccessibilityLabel,
  testID,
}) => {
  const { t } = useTranslation();
  const { isTablet, scale, fs } = useResponsive();
  const look = TONE[tone];
  const badge = isTablet ? scale(44) : dimens.confirmDialogBadge;
  const padding = isTablet ? scale(dimens.confirmDialogPadding) : dimens.confirmDialogPadding;
  const iconSize = Math.round(badge * 0.5);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose ?? noop}>
      <View style={styles.backdrop}>
        {/* Figma's modal is near square on a tablet (~1.25 : 1): width about 15 times the title size. */}
        <View style={[styles.card, { maxWidth: isTablet ? scale(300) : dimens.confirmDialogMaxWidth, padding }]} testID={testID}>
          {/* Decorative rings behind the badge, clipped by the card. */}
          {RINGS.map((ring) => (
            <View
              key={ring.scale}
              pointerEvents="none"
              style={[styles.ring, ringBox(badge * ring.scale, ring.color, padding, badge)]}
            />
          ))}

          <View style={styles.topRow}>
            <View style={[styles.badge, { width: badge, height: badge, borderRadius: badge / 2, backgroundColor: look.bg }]}>
              {tone === 'danger' && <DangerTriangleIcon size={iconSize} color={look.icon} />}
              {tone === 'warning' && <AppIcon name="dangerCircle" size={iconSize} color={look.icon} />}
              {tone === 'success' && <CheckCircleIcon size={iconSize} color={look.icon} />}
            </View>
            {onClose && !hideClose && (
              <TouchableOpacity
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t('dialog.a11y.close')}
                hitSlop={12}
                testID={testID && `${testID}-close`}
              >
                <AppIcon name="close" size={isTablet ? scale(22) : dimens.dialogCloseIcon} color={colors.dialogCloseIcon} />
              </TouchableOpacity>
            )}
          </View>

          {title !== '' && <Text style={[styles.title, { fontSize: fs('confirmTitle') }]}>{title}</Text>}
          <Text style={[styles.message, { fontSize: fs('confirmMessage') }]}>{message}</Text>
          {children && <View style={styles.content}>{children}</View>}

          {note && (
            <View style={styles.note}>
              <AppIcon name="infoCircle" size={isTablet ? scale(18) : dimens.dialogNoteIcon} color={colors.primary} />
              <Text style={[styles.noteText, { fontSize: fs('confirmNote') }]}>{note}</Text>
            </View>
          )}

          <View style={styles.actions}>
            {cancelLabel && onCancel && (
              <View style={styles.flex1}>
                <AppButton
                  label={cancelLabel}
                  onPress={onCancel}
                  variant="secondary"
                  size="compact"
                  accessibilityLabel={cancelAccessibilityLabel}
                  testID={testID && `${testID}-cancel`}
                />
              </View>
            )}
            <View style={styles.flex1}>
              <AppButton
                label={confirmLabel}
                onPress={onConfirm}
                size="compact"
                gradient
                accessibilityLabel={confirmAccessibilityLabel}
                testID={testID && `${testID}-confirm`}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const noop = () => undefined;

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
    borderRadius: radii.lg,
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
  content: {
    marginTop: spacing.md,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
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
