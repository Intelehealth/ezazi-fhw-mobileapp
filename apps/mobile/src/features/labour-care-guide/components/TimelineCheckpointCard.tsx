import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/core/ui/Text';
import { AppButton } from '@/core/ui/AppButton';
import { AppIcon, LockKeyholeBadgeIcon } from '@/core/ui/icons';
import { colors, dimens, spacing } from '@/core/config/theme';
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

interface StatusLook {
  cardBg: string;
  cardBorder: string;
  chipBg: string;
  chipText: string;
  dotBorder: string;
  dotFill: string;
}

// Figma 251:364, one look per card state.
const STATUS_LOOK: Record<CheckpointStatus, StatusLook> = {
  completed: {
    cardBg: colors.timelineCompletedBg,
    cardBorder: colors.timelineCompletedBorder,
    chipBg: colors.timelineCompletedChipBg,
    chipText: colors.timelineCompletedChipText,
    dotBorder: colors.timelineAccent,
    dotFill: colors.timelineAccent,
  },
  missed: {
    cardBg: colors.white,
    cardBorder: colors.timelineMissedBorder,
    chipBg: colors.timelineMissedChipBg,
    chipText: colors.timelineMissedChipText,
    dotBorder: colors.timelineMissedDot,
    dotFill: colors.white,
  },
  dueNow: {
    cardBg: colors.timelineDueBg,
    cardBorder: colors.timelineDueBorder,
    chipBg: colors.timelineDueChipBg,
    chipText: colors.timelineAccent,
    dotBorder: colors.timelineDueDot,
    dotFill: colors.white,
  },
  upcoming: {
    cardBg: colors.white,
    cardBorder: colors.timelineUpcomingBorder,
    chipBg: colors.timelineUpcomingChipBg,
    chipText: colors.secondaryTextFigma,
    dotBorder: colors.timelineUpcomingDot,
    dotFill: colors.timelineUpcomingDotFill,
  },
  sosCaptured: {
    cardBg: colors.timelineSosBg,
    cardBorder: colors.timelineMissedBorder,
    chipBg: colors.timelineMissedChipBg,
    chipText: colors.timelineMissedChipText,
    dotBorder: colors.timelineMissedDot,
    dotFill: colors.white,
  },
};

// "9:30 AM": Figma writes the day period in capitals whatever the device locale does.
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function minutesUntil(iso: string): number {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60_000));
}

/**
 * One row of the labour-monitoring timeline: date/time, the rail with its status dot, and a
 * state-specific card. Tablet sizes are Figma units (fromFigma); the dot and the date sit
 * level with the card's middle, as in the frame.
 */
export const TimelineCheckpointCard: React.FC<TimelineCheckpointCardProps> = ({
  checkpoint,
  isFirst,
  isLast,
  onRecordNow,
}) => {
  const { t } = useTranslation();
  const { isTablet, fs, fromFigma } = useResponsive();
  const look = STATUS_LOOK[checkpoint.status];

  const dotSize = isTablet ? fromFigma(42) : dimens.timelineDotSize.phone;
  const bodySize = isTablet ? fromFigma(16) : fs('timelineCardBody');
  const bodyStyle = [styles.body, { fontSize: bodySize }];
  const sizes = isTablet
    ? {
        dateColumn: { width: fromFigma(96) },
        date: { fontSize: fromFigma(16) },
        time: { fontSize: fromFigma(24), marginTop: fromFigma(3) },
        rail: { width: dotSize, marginHorizontal: fromFigma(30) },
        card: {
          paddingHorizontal: fromFigma(19),
          paddingVertical: fromFigma(18),
          marginVertical: fromFigma(10),
          borderRadius: fromFigma(16),
        },
        chip: { height: fromFigma(32), paddingHorizontal: fromFigma(11), borderRadius: fromFigma(8) },
        chipText: { fontSize: fromFigma(16) },
        bodyGap: { marginTop: fromFigma(16) },
        buttonGap: { marginTop: fromFigma(16) },
        lockBadge: fromFigma(40),
        checkIcon: fromFigma(28),
      }
    : {
        dateColumn: { width: 76 },
        date: { fontSize: fs('timelineDate') },
        time: { fontSize: fs('timelineTime'), marginTop: spacing.xs / 2 },
        rail: { width: dotSize, marginHorizontal: spacing.sm },
        card: { padding: spacing.md, marginVertical: spacing.sm, borderRadius: 12 },
        chip: { height: 22, paddingHorizontal: spacing.sm, borderRadius: 6 },
        chipText: { fontSize: fs('timelineCardLabel') },
        bodyGap: { marginTop: spacing.sm },
        buttonGap: { marginTop: spacing.md },
        lockBadge: 30,
        checkIcon: Math.round(dotSize * 0.6),
      };

  return (
    <View style={styles.row}>
      <View style={sizes.dateColumn}>
        <Text style={[styles.date, sizes.date]}>{formatDate(checkpoint.scheduledAt)}</Text>
        <Text style={[styles.time, sizes.time]}>{formatTime(checkpoint.scheduledAt)}</Text>
      </View>

      <View style={[styles.rail, sizes.rail]}>
        <View style={[styles.railLine, isFirst && styles.railLineHidden]} />
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              borderColor: look.dotBorder,
              backgroundColor: look.dotFill,
            },
          ]}
        >
          {checkpoint.status === 'completed' && (
            <AppIcon name="check" size={sizes.checkIcon} color={colors.onPrimary} />
          )}
        </View>
        <View style={[styles.railLine, isLast && styles.railLineHidden]} />
      </View>

      <View style={[styles.card, sizes.card, { backgroundColor: look.cardBg, borderColor: look.cardBorder }]}>
        <View style={styles.topLine}>
          <View style={styles.flex1}>
            <View style={[styles.chip, sizes.chip, { backgroundColor: look.chipBg }]}>
              <Text style={[styles.chipText, sizes.chipText, { color: look.chipText }]}>
                {t(`timeline.status.${checkpoint.status}`).toUpperCase()}
              </Text>
            </View>

            {checkpoint.status === 'completed' && (
              <View style={[styles.completedBodyRow, sizes.bodyGap]}>
                <Text style={bodyStyle}>{t('timeline.checkpoint.completedBody')}</Text>
                {checkpoint.recordedAt && (
                  <Text style={bodyStyle}>
                    {t('timeline.checkpoint.completedRecordedAt', { time: formatTime(checkpoint.recordedAt) })}
                  </Text>
                )}
              </View>
            )}

            {checkpoint.status === 'sosCaptured' && (
              <Text style={[bodyStyle, sizes.bodyGap]}>{t('timeline.checkpoint.sosCapturedBody')}</Text>
            )}

            {checkpoint.status === 'missed' && (
              <Text style={[bodyStyle, sizes.bodyGap]}>{t('timeline.checkpoint.missedBody')}</Text>
            )}

            {checkpoint.status === 'dueNow' && (
              <Text style={[bodyStyle, sizes.bodyGap]}>{t('timeline.checkpoint.dueNowBody')}</Text>
            )}

            {checkpoint.status === 'upcoming' && (
              <Text style={[bodyStyle, styles.upcomingBody, sizes.bodyGap]}>
                {t('timeline.checkpoint.upcomingBody', {
                  time: formatTime(checkpoint.scheduledAt),
                  minutes: minutesUntil(checkpoint.scheduledAt),
                })}
              </Text>
            )}
          </View>

          {checkpoint.status === 'upcoming' && <LockKeyholeBadgeIcon size={sizes.lockBadge} />}
        </View>

        {checkpoint.status === 'dueNow' && (
          <AppButton
            label={t('timeline.checkpoint.recordNow')}
            onPress={onRecordNow}
            size="compact"
            showChevron
            style={sizes.buttonGap}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  date: {
    color: colors.secondaryTextFigma,
  },
  time: {
    color: colors.primaryTextDarkFigma,
    fontWeight: '700',
  },
  rail: {
    // Stretch to the row's height so the line runs on into the next row's rail.
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  railLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.timelineRail,
  },
  railLineHidden: {
    backgroundColor: 'transparent',
  },
  dot: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    borderWidth: 1,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chip: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  chipText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  body: {
    color: colors.timelineBody,
    flexShrink: 1,
  },
  completedBodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  upcomingBody: {
    color: colors.secondaryTextFigma,
  },
});
