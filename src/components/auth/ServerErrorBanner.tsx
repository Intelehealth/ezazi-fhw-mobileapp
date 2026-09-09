import React from 'react';
import { AccessibilityInfo, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/config/theme';
import { useResponsive } from '@/hooks/useResponsive';

/**
 * Server-error banner rendered ABOVE the primary CTA of auth forms.
 *
 * Matches Figma "Username or password is incorrect" + "Something went wrong":
 *   ┌───────────────────────────────────────────────┐
 *   │ (icon)  Title in red, bold                     │
 *   │         Subtitle in grey                       │
 *   └───────────────────────────────────────────────┘
 *
 * Replaces Android-only `showToast(...)` for auth server errors — the previous
 * toast pattern was invisible on iOS. Callers own the state; render `null` when
 * there is no active error.
 *
 * All copy comes from callers (already i18n-resolved). Keep both `title` and
 * `subtitle` short: this banner lives on-screen alongside the field labels.
 */
export interface ServerErrorBannerProps {
  title: string;
  subtitle?: string;
  /** Optional dismiss handler — shows a tap target on the whole banner when set. */
  onDismiss?: () => void;
  style?: ViewStyle;
  /** Overrides accessibility label; defaults to `title. subtitle`. */
  accessibilityLabel?: string;
}

export const ServerErrorBanner: React.FC<ServerErrorBannerProps> = ({
  title,
  subtitle,
  onDismiss,
  style,
  accessibilityLabel,
}) => {
  const { fs } = useResponsive();
  const label = accessibilityLabel ?? (subtitle ? `${title}. ${subtitle}` : title);

  // Announce to screen readers when a server error appears — critical for
  // a nurse on a shift with the phone in their pocket.
  React.useEffect(() => {
    AccessibilityInfo.announceForAccessibility(label);
  }, [label]);

  const content = (
    <>
      <View style={styles.iconWrap}>
        <Svg width={24} height={24} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={12} fill={colors.error} />
          {/* exclamation mark */}
          <Path d="M12 5 v9" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />
          <Circle cx={12} cy={18} r={1.5} fill="#FFFFFF" />
        </Svg>
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.title, { fontSize: fs('label') }]} numberOfLines={2}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={[styles.subtitle, { fontSize: fs('error') }]} numberOfLines={3}>
            {subtitle}
          </Text>
        )}
      </View>
    </>
  );

  const commonProps = {
    style: [styles.banner, style],
    accessibilityRole: 'alert' as const,
    accessibilityLabel: label,
    accessibilityLiveRegion: 'polite' as const,
    testID: 'server-error-banner',
  };

  if (onDismiss) {
    return (
      <TouchableOpacity
        {...commonProps}
        onPress={onDismiss}
        accessibilityHint="Tap to dismiss"
      >
        {content}
      </TouchableOpacity>
    );
  }
  return <View {...commonProps}>{content}</View>;
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    // Pink-tinted background matching Figma. Falls back to a mixed shade of
    // `colors.error` at ~15% opacity if a palette token gets added later.
    backgroundColor: '#FDE7EE',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  iconWrap: {
    paddingTop: 1,
  },
  textCol: {
    flex: 1,
  },
  title: {
    color: colors.error,
    fontWeight: '600',
  },
  subtitle: {
    color: '#4A4A4A',
    marginTop: 2,
  },
});
