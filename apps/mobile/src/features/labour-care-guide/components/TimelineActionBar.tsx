import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '@/core/ui/Text';
import { AppButton } from '@/core/ui/AppButton';
import { AppIcon, RxIcon, SosAlertIcon } from '@/core/ui/icons';
import { colors, radii, spacing } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

interface TimelineActionBarProps {
  onSos: () => void;
  onChat: () => void;
  onVideoCall: () => void;
  onRx: () => void;
  onEndStage: () => void;
}

/** Fixed bottom bar: SOS/Chat/Video Call/Rx quick actions, then the primary end-stage action. */
export const TimelineActionBar: React.FC<TimelineActionBarProps> = ({
  onSos,
  onChat,
  onVideoCall,
  onRx,
  onEndStage,
}) => {
  const { t } = useTranslation();
  const { isTablet, fs, scale } = useResponsive();
  // First real consumer of safe-area insets in this codebase (see
  // PatientHeader's comment) — this bar sits flush with the bottom edge, so
  // it genuinely needs the inset, unlike screens that just scroll under it.
  const insets = useSafeAreaInsets();
  const iconSize = isTablet ? scale(22) : 20;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.pill, styles.sosPill]}
          onPress={onSos}
          accessibilityRole="button"
          accessibilityLabel={t('timeline.a11y.sos')}
          activeOpacity={0.85}
        >
          <SosAlertIcon size={iconSize} color={colors.onPrimary} />
          <Text style={[styles.pillLabel, styles.sosLabel, { fontSize: fs('timelineActionLabel') }]}>
            {t('timeline.actions.sos')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pill}
          onPress={onChat}
          accessibilityRole="button"
          accessibilityLabel={t('timeline.a11y.chat')}
          activeOpacity={0.8}
        >
          <AppIcon name="chatBubble" size={iconSize} color={colors.primary} />
          <Text style={[styles.pillLabel, { fontSize: fs('timelineActionLabel') }]}>{t('timeline.actions.chat')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pill}
          onPress={onVideoCall}
          accessibilityRole="button"
          accessibilityLabel={t('timeline.a11y.videoCall')}
          activeOpacity={0.8}
        >
          <AppIcon name="videoCamera" size={iconSize} color={colors.primary} />
          <Text style={[styles.pillLabel, { fontSize: fs('timelineActionLabel') }]}>
            {t('timeline.actions.videoCall')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pill}
          onPress={onRx}
          accessibilityRole="button"
          accessibilityLabel={t('timeline.a11y.rx')}
          activeOpacity={0.8}
        >
          <RxIcon size={iconSize} color={colors.primary} />
          <Text style={[styles.pillLabel, { fontSize: fs('timelineActionLabel') }]}>{t('timeline.actions.rx')}</Text>
        </TouchableOpacity>
      </View>

      <AppButton label={t('timeline.endStage')} onPress={onEndStage} style={styles.endStageButton} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sosPill: {
    backgroundColor: colors.error,
    borderWidth: 0,
  },
  pillLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
  sosLabel: {
    color: colors.onPrimary,
  },
  endStageButton: {
    marginTop: spacing.md,
  },
});
