import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '@/core/ui/Text';
import { AppButton } from '@/core/ui/AppButton';
import { ChatRoundIcon, DangerTriangleIcon, PillIcon, VideoCameraIcon, type IconProps } from '@/core/ui/icons';
import { colors, spacing } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

interface TimelineActionBarProps {
  onSos: () => void;
  onChat: () => void;
  onVideoCall: () => void;
  onRx: () => void;
  onEndStage: () => void;
}

type ActionKey = 'sos' | 'chat' | 'videoCall' | 'rx';

// In Figma order (251:527); `weight` = the button's Figma width, as a flex weight so the row keeps
// its proportions. Labels and accessibility text come from `timeline.actions.*` / `timeline.a11y.*`.
const ACTIONS: readonly { key: ActionKey; Icon: React.FC<IconProps>; weight: number }[] = [
  { key: 'sos', Icon: DangerTriangleIcon, weight: 152 },
  { key: 'chat', Icon: ChatRoundIcon, weight: 151 },
  { key: 'videoCall', Icon: VideoCameraIcon, weight: 219 },
  { key: 'rx', Icon: PillIcon, weight: 150 },
];

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
  // The app draws edge to edge, so the bottom inset is the system navigation bar; the Figma
  // bottom margin goes on top of it.
  const insets = useSafeAreaInsets();
  const onPress: Record<ActionKey, () => void> = { sos: onSos, chat: onChat, videoCall: onVideoCall, rx: onRx };
  // One visible size for all four icons: the Chat bubble's 30 units in its Figma slot.
  const iconSize = isTablet ? fromFigma(30) : 18;
  const labelStyle = { fontSize: isTablet ? fromFigma(20) : fs('timelineActionLabel') };
  const pillStyle = isTablet
    ? { flexDirection: 'row' as const, height: fromFigma(80), gap: fromFigma(12), borderRadius: fromFigma(16) }
    : styles.pillPhone;

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
        {ACTIONS.map(({ key, Icon, weight }) => {
          const isSos = key === 'sos';
          return (
            <TouchableOpacity
              key={key}
              style={[styles.pill, pillStyle, isTablet ? { flex: weight } : styles.flex1, isSos && styles.sosPill]}
              onPress={onPress[key]}
              accessibilityRole="button"
              accessibilityLabel={t(`timeline.a11y.${key}`)}
              activeOpacity={0.8}
            >
              <Icon size={iconSize} color={isSos ? colors.onPrimary : colors.primary} />
              <Text style={[styles.pillLabel, isSos && styles.sosLabel, labelStyle]}>{t(`timeline.actions.${key}`)}</Text>
            </TouchableOpacity>
          );
        })}
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
