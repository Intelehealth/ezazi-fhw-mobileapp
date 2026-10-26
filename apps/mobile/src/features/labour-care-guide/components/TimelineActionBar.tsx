import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '@/core/ui/Text';
import { AppButton } from '@/core/ui/AppButton';
import { ChatRoundIcon, DangerTriangleIcon, PillIcon, VideoCameraIcon } from '@/core/ui/icons';
import { colors, spacing } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

interface TimelineActionBarProps {
  onSos: () => void;
  onChat: () => void;
  onVideoCall: () => void;
  onRx: () => void;
  onEndStage: () => void;
}

// Figma 251:527 button widths (152/151/219/150 units), as flex weights so the row keeps their proportions.
const ACTION_WEIGHTS = { sos: 152, chat: 151, videoCall: 219, rx: 150 } as const;

/**
 * Fixed bottom bar: SOS/Chat/Video Call/Rx quick actions, then the primary end-stage action.
 * Tablet follows Figma 251:526 (icon beside its label); phone stacks them to fit four across.
 */
export const TimelineActionBar: React.FC<TimelineActionBarProps> = ({
  onSos,
  onChat,
  onVideoCall,
  onRx,
  onEndStage,
}) => {
  const { t } = useTranslation();
  const { isTablet, fs, fromFigma } = useResponsive();
  // First real consumer of safe-area insets in this codebase (see
  // PatientHeader's comment). The app draws edge to edge, so the inset is the
  // system navigation bar; the Figma bottom margin goes on top of it.
  const insets = useSafeAreaInsets();
  // One visible size for all four icons: the Chat bubble's 30 units in its Figma slot.
  const iconSize = isTablet ? fromFigma(30) : 18;
  const labelStyle = { fontSize: isTablet ? fromFigma(20) : fs('timelineActionLabel') };
  const pillStyle = isTablet
    ? { flexDirection: 'row' as const, height: fromFigma(80), gap: fromFigma(12), borderRadius: fromFigma(16) }
    : styles.pillPhone;
  const weight = (key: keyof typeof ACTION_WEIGHTS) => (isTablet ? { flex: ACTION_WEIGHTS[key] } : styles.flex1);

  return (
    <View
      style={[
        styles.container,
        isTablet
          ? {
              paddingHorizontal: fromFigma(40),
              paddingTop: fromFigma(25),
              paddingBottom: insets.bottom + fromFigma(24),
            }
          : { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.md },
      ]}
    >
      <View style={[styles.quickActions, isTablet && { gap: fromFigma(16) }]}>
        <TouchableOpacity
          style={[styles.pill, pillStyle, weight('sos'), styles.sosPill]}
          onPress={onSos}
          accessibilityRole="button"
          accessibilityLabel={t('timeline.a11y.sos')}
          activeOpacity={0.85}
        >
          <DangerTriangleIcon size={iconSize} color={colors.onPrimary} />
          <Text style={[styles.pillLabel, styles.sosLabel, labelStyle]}>{t('timeline.actions.sos')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, pillStyle, weight('chat')]}
          onPress={onChat}
          accessibilityRole="button"
          accessibilityLabel={t('timeline.a11y.chat')}
          activeOpacity={0.8}
        >
          <ChatRoundIcon size={iconSize} color={colors.primary} />
          <Text style={[styles.pillLabel, labelStyle]}>{t('timeline.actions.chat')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, pillStyle, weight('videoCall')]}
          onPress={onVideoCall}
          accessibilityRole="button"
          accessibilityLabel={t('timeline.a11y.videoCall')}
          activeOpacity={0.8}
        >
          <VideoCameraIcon size={iconSize} color={colors.primary} />
          <Text style={[styles.pillLabel, labelStyle]}>{t('timeline.actions.videoCall')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, pillStyle, weight('rx')]}
          onPress={onRx}
          accessibilityRole="button"
          accessibilityLabel={t('timeline.a11y.rx')}
          activeOpacity={0.8}
        >
          <PillIcon size={iconSize} color={colors.primary} />
          <Text style={[styles.pillLabel, labelStyle]}>{t('timeline.actions.rx')}</Text>
        </TouchableOpacity>
      </View>

      <AppButton
        label={t('timeline.endStage')}
        onPress={onEndStage}
        style={{ marginTop: isTablet ? fromFigma(16) : spacing.md }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.headerDividerFigma,
  },
  flex1: {
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.timelineActionBorder,
    backgroundColor: colors.white,
  },
  pillPhone: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  sosPill: {
    backgroundColor: colors.timelineSos,
    borderWidth: 0,
  },
  pillLabel: {
    color: colors.timelineActionText,
    fontWeight: '700',
  },
  sosLabel: {
    color: colors.onPrimary,
  },
});
