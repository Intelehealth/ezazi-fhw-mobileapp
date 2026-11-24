import React from 'react';
import { Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors, spacing } from '@/core/config/theme';
import { AppIcon } from './icons';
import { Text } from './Text';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

export type PhotoSource = 'camera' | 'gallery';

/**
 * THE photo-source chooser — Camera or Gallery, then Cancel. Every label is a
 * prop: core/ui does not translate, and the copy it shows lives in a feature's
 * namespace. It does NOT close itself on a choice — the caller closes once the
 * capture resolves, so the chooser is not left behind a half-finished camera.
 */
interface PhotoSourceDialogProps {
  visible: boolean;
  title: string;
  cameraLabel: string;
  galleryLabel: string;
  /** t('common.cancel'). */
  cancelLabel: string;
  onSelect: (source: PhotoSource) => void;
  onClose: () => void;
}

export const PhotoSourceDialog: React.FC<PhotoSourceDialogProps> = ({
  visible,
  title,
  cameraLabel,
  galleryLabel,
  cancelLabel,
  onSelect,
  onClose,
}) => {
  const { fs, cornerRadius } = useResponsive();

  const sources: { source: PhotoSource; label: string; icon: 'camera' | 'image' }[] = [
    { source: 'camera', label: cameraLabel, icon: 'camera' },
    { source: 'gallery', label: galleryLabel, icon: 'image' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { borderRadius: cornerRadius }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { fontSize: fs('heading') }]}>{title}</Text>
          </View>

          <View style={styles.body}>
            {sources.map(({ source, label, icon }) => (
              <TouchableOpacity
                key={source}
                style={styles.sourceRow}
                onPress={() => onSelect(source)}
                accessibilityRole="button"
                accessibilityLabel={label}
                activeOpacity={0.7}
              >
                <AppIcon name={icon} size={24} color={colors.primary} />
                <Text style={[styles.sourceLabel, { fontSize: fs('input') }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.btn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              <Text style={[styles.btnText, { fontSize: fs('button') }]}>{cancelLabel}</Text>
            </TouchableOpacity>
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

  header: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + spacing.xs,
  },

  title: {
    color: colors.white,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  body: {
    paddingHorizontal: spacing.md + spacing.xs,
    paddingVertical: spacing.sm,
  },

  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },

  sourceLabel: {
    color: colors.textPrimary,
    fontWeight: '600',
  },

  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },

  btn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },

  btnText: {
    color: colors.primary,
    fontWeight: '600',
  },
});
