import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/core/ui/Text';
import { AppButton } from '@/core/ui/AppButton';
import { AppIcon } from '@/core/ui/icons';
import { colors, dimens, radii, spacing } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import type { CheckpointStatus, TimelineCheckpoint } from '../domain/timeline.types';

interface TimelineCheckpointCardProps {
  checkpoint: TimelineCheckpoint;
  /** Hides the rail's top connector — this is the first row in the list. */
  isFirst: boolean;
  /** Hides the rail's bottom connector — this is the last row in the list. */
  isLast: boolean;
  onRecordNow: () => void;
}

const STATUS_ACCENT: Record<CheckpointStatus, string> = {
  completed: colors.success,
  missed: colors.error,
  dueNow: colors.primary,
  upcoming: colors.border,
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function minutesUntil(iso: string): number {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60_000));
}

/** One row of the labour-monitoring timeline: date/time rail, status dot, and a state-specific card. */
export const TimelineCheckpointCard: React.FC<TimelineCheckpointCardProps> = ({
  checkpoint,
  isFirst,
  isLast,
  onRecordNow,
}) => {
  const { t } = useTranslation();
  const { isTablet, fs, scale } = useResponsive();
  const accent = STATUS_ACCENT[checkpoint.status];
  const dotSize = isTablet ? dimens.timelineDotSize.tablet : dimens.timelineDotSize.phone;

  return (
    <View style={styles.row}>
      <View style={styles.dateTimeColumn}>
        <Text style={[styles.date, { fontSize: fs('timelineDate') }]}>{formatDate(checkpoint.scheduledAt)}</Text>
        <Text style={[styles.time, { fontSize: fs('timelineTime') }]}>{formatTime(checkpoint.scheduledAt)}</Text>
      </View>

      <View style={[styles.rail, { width: dotSize }]}>
        <View style={[styles.railLine, isFirst && styles.railLineHidden]} />
        {checkpoint.status === 'completed' ? (
          <View style={[styles.dotFilled, { width: dotSize, height: dotSize, borderRadius: dotSize / 2 }]}>
            <AppIcon name="check" size={dotSize * 0.55} color={colors.onPrimary} />
          </View>
        ) : (
          <View
            style={[
              styles.dotOutline,
              { width: dotSize, height: dotSize, borderRadius: dotSize / 2, borderColor: accent },
            ]}
          />
        )}
        <View style={[styles.railLine, isLast && styles.railLineHidden]} />
      </View>

      <View style={[styles.card, { borderColor: accent }]}>
        <Text style={[styles.badge, { color: accent, fontSize: fs('timelineCardLabel') }]}>
          {t(`timeline.status.${checkpoint.status}`).toUpperCase()}
        </Text>

        {checkpoint.status === 'completed' && (
          <View style={styles.completedBodyRow}>
            <Text style={[styles.body, { fontSize: fs('timelineCardBody') }]}>
              {t('timeline.checkpoint.completedBody')}
            </Text>
            {checkpoint.recordedAt && (
              <Text style={[styles.recordedAt, { fontSize: fs('timelineDate') }]}>
                {t('timeline.checkpoint.completedRecordedAt', { time: formatTime(checkpoint.recordedAt) })}
              </Text>
            )}
          </View>
        )}

        {checkpoint.status === 'missed' && (
          <Text style={[styles.body, { fontSize: fs('timelineCardBody') }]}>{t('timeline.checkpoint.missedBody')}</Text>
        )}

        {checkpoint.status === 'dueNow' && (
          <>
            <Text style={[styles.body, { fontSize: fs('timelineCardBody') }]}>{t('timeline.checkpoint.dueNowBody')}</Text>
            <AppButton
              label={t('timeline.checkpoint.recordNow')}
              onPress={onRecordNow}
              showArrow
              style={styles.recordButton}
            />
          </>
        )}

        {checkpoint.status === 'upcoming' && (
          <View style={styles.upcomingRow}>
            <Text style={[styles.body, styles.bodyMuted, { fontSize: fs('timelineCardBody') }]}>
              {t('timeline.checkpoint.upcomingBody', {
                time: formatTime(checkpoint.scheduledAt),
                minutes: minutesUntil(checkpoint.scheduledAt),
              })}
            </Text>
            <AppIcon name="lock" size={isTablet ? scale(20) : 18} color={colors.textDisabled} />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dateTimeColumn: {
    width: 76,
  },
  date: {
    color: colors.textSecondary,
  },
  time: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: spacing.xs / 2,
  },
  rail: {
    // `row`'s alignItems: 'flex-start' (for the date/time column) would
    // otherwise shrink this to its content height, breaking the line's
    // connection to the next row's dot — this opts back into the default
    // stretch so the rail always matches the card's actual height.
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  railLine: {
    flex: 1,
    width: 2,
    minHeight: spacing.lg,
    backgroundColor: colors.border,
  },
  railLineHidden: {
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOutline: {
    backgroundColor: colors.white,
    borderWidth: 2,
  },
  card: {
    flex: 1,
    marginLeft: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  badge: {
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
  },
  body: {
    color: colors.textSecondary,
    flexShrink: 1,
  },
  bodyMuted: {
    color: colors.textDisabled,
  },
  completedBodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  recordedAt: {
    color: colors.textDisabled,
  },
  recordButton: {
    marginTop: spacing.sm,
  },
  upcomingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
