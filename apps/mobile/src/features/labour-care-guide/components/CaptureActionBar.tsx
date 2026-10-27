import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { colors, spacing } from '@/core/config/theme';
import { AppButton } from '@/core/ui/AppButton';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { AppIcon, ChatRoundIcon, PillIcon, VideoCameraIcon, type IconProps } from '@/core/ui/icons';
import { Text } from '@/core/ui/Text';

interface CaptureActionBarProps {
  showBack: boolean;
  onBack: () => void;
  onVideoCall: () => void;
  onChat: () => void;
  onRx: () => void;
  onNext: () => void;
  nextDisabled: boolean;
}

type ActionKey = 'videoCall' | 'chat' | 'rx';

// Figma 251:556 order; labels and accessibility text are the Timeline's (`timeline.actions.*`).
const ACTIONS: readonly { key: ActionKey; Icon: React.FC<IconProps> }[] = [
  { key: 'videoCall', Icon: VideoCameraIcon },
  { key: 'chat', Icon: ChatRoundIcon },
  { key: 'rx', Icon: PillIcon },
];

/**
 * The capture screen's fixed bottom bar (Figma 251:556): Back from the second tab on, Video Call,
 * Chat and Rx, then Next. Sizes follow the Timeline's bar (TimelineActionBar).
 */
export const CaptureActionBar: React.FC<CaptureActionBarProps> = ({
  showBack,
  onBack,
  onVideoCall,
  onChat,
  onRx,
  onNext,
  nextDisabled,
}) => {
  const { t } = useTranslation();
  const { isTablet, fs, fromFigma } = useResponsive();
  const insets = useSafeAreaInsets();
  const onPress: Record<ActionKey, () => void> = { videoCall: onVideoCall, chat: onChat, rx: onRx };
  const iconSize = isTablet ? fromFigma(30) : 18;
  const labelStyle = { fontSize: isTablet ? fromFigma(20) : fs('timelineActionLabel') };
  const pillStyle = isTablet
    ? { height: fromFigma(80), gap: fromFigma(12), borderRadius: fromFigma(16) }
    : { height: 48, gap: spacing.xs, borderRadius: 12 };

  const pill = (key: string, label: string, accessibilityLabel: string, icon: React.ReactNode, onTap: () => void) => (
    <TouchableOpacity
      key={key}
      style={[styles.pill, pillStyle]}
      onPress={onTap}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.8}
    >
      {icon}
      <Text style={[styles.pillLabel, labelStyle]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.container,
        isTablet
          ? { paddingHorizontal: fromFigma(40), paddingTop: fromFigma(25), paddingBottom: insets.bottom + fromFigma(24) }
          : { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.md },
      ]}
    >
      <View style={[styles.actions, { gap: isTablet ? fromFigma(16) : spacing.sm }]}>
        {showBack &&
          pill('back', t('capture.back'), t('capture.back'), <AppIcon name="chevronLeft" color={colors.primary} size={iconSize} />, onBack)}
        {ACTIONS.map(({ key, Icon }) =>
          pill(key, t(`timeline.actions.${key}`), t(`timeline.a11y.${key}`), <Icon size={iconSize} color={colors.primary} />, onPress[key]),
        )}
      </View>
      <AppButton
        label={t('capture.next')}
        onPress={onNext}
        disabled={nextDisabled}
        disabledTone="brand"
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
  actions: {
    flexDirection: 'row',
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.timelineActionBorder,
    backgroundColor: colors.white,
  },
  pillLabel: {
    color: colors.timelineActionText,
    fontWeight: '600',
  },
});
