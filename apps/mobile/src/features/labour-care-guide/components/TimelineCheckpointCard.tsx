import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/core/ui/Text';
import { AppButton } from '@/core/ui/AppButton';
import { AppIcon, DangerTriangleIcon, LockKeyholeBadgeIcon } from '@/core/ui/icons';
import { colors, dimens, letterSpacing, radii, spacing } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { formatClockTime, formatDate } from '@/core/utils/calendar';
import { minutesUntil } from '@/core/utils/datetime';
import type { CheckpointStatus, TimelineCheckpoint } from '../domain/timeline.types';
import { LABOUR_TEST_IDS } from '../testIds';

interface TimelineCheckpointCardProps {
  checkpoint: TimelineCheckpoint;
  /** Hides the rail's top connector — this is the first row in the list. */
  isFirst: boolean;
  /** Hides the rail's bottom connector — this is the last row in the list. */
  isLast: boolean;
  onOpen: () => void;
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
};

// An SOS card keeps its state's chip; the card and dot turn pink (Figma timeline, SOS card).
const SOS_LOOK: Pick<StatusLook, 'cardBg' | 'cardBorder' | 'dotBorder' | 'dotFill'> = {
  cardBg: colors.white,
  cardBorder: colors.timelineMissedBorder,
  dotBorder: colors.timelineMissedDot,
  dotFill: colors.white,
};

// Android `getSosContentRes` / `getNormalContentRes`: the body line per state.
const BODY_KEY: Record<'completed' | 'missed' | 'dueNow', { normal: string; sos: string }> = {
  completed: { normal: 'timeline.checkpoint.completedBody', sos: 'timeline.checkpoint.sosCompletedBody' },
  missed: { normal: 'timeline.checkpoint.missedBody', sos: 'timeline.checkpoint.sosMissedBody' },
  dueNow: { normal: 'timeline.checkpoint.dueNowBody', sos: 'timeline.checkpoint.sosDueNowBody' },
};

/**
 * One row of the labour-monitoring timeline: date/time, the rail with its status dot, and a
 * state-specific card. Tablet sizes are Figma units (fromFigma); the dot and the date sit
 * level with the card's middle, as in the frame.
 */
export const TimelineCheckpointCard: React.FC<TimelineCheckpointCardProps> = ({
  checkpoint,
  isFirst,
  isLast,
  onOpen,
}) => {
  const { t } = useTranslation();
  const { isTablet, fs, fromFigma } = useResponsive();
  const isSos = Boolean(checkpoint.isSos);
  const look = isSos ? { ...STATUS_LOOK[checkpoint.status], ...SOS_LOOK } : STATUS_LOOK[checkpoint.status];

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
        sosBadge: { height: fromFigma(40), paddingHorizontal: fromFigma(12), gap: fromFigma(8), borderRadius: fromFigma(8) },
        sosIcon: fromFigma(24),
        sosText: { fontSize: fromFigma(20) },
        chipText: { fontSize: fromFigma(16) },
        bodyGap: { marginTop: fromFigma(16) },
        buttonGap: { marginTop: fromFigma(16) },
        lockBadge: fromFigma(40),
        checkIcon: fromFigma(28),
      }
    : {
        dateColumn: { width: dimens.timelineDateColumn },
        date: { fontSize: fs('timelineDate') },
        time: { fontSize: fs('timelineTime'), marginTop: spacing.xs / 2 },
        rail: { width: dotSize, marginHorizontal: spacing.sm },
        card: { padding: spacing.md, marginVertical: spacing.sm, borderRadius: radii.card },
        chip: { height: dimens.timelineChipHeight, paddingHorizontal: spacing.sm, borderRadius: radii.chip },
        sosBadge: { height: dimens.timelineSosBadgeHeight, paddingHorizontal: spacing.sm, gap: spacing.xs, borderRadius: radii.chip },
        sosIcon: dimens.timelineSosIcon,
        sosText: { fontSize: fs('timelineCardLabel') },
        chipText: { fontSize: fs('timelineCardLabel') },
        bodyGap: { marginTop: spacing.sm },
        buttonGap: { marginTop: spacing.md },
        lockBadge: dimens.timelineLockBadge,
        checkIcon: Math.round(dotSize * 0.6),
      };

  const openLabelKey =
    checkpoint.status === 'dueNow' && checkpoint.access === 'write'
      ? 'timeline.checkpoint.recordNow'
      : checkpoint.status === 'completed' && (checkpoint.access === 'edit' || checkpoint.access === 'read')
        ? 'timeline.checkpoint.show'
        : null;

  return (
    <View style={styles.row}>
      <View style={sizes.dateColumn}>
        {/* Gregorian for now; Android shows BS in Nepal, support comes later (Kaveri, 2026-10-28). */}
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.date, sizes.date]}>
          {formatDate(checkpoint.scheduledAt, 'AD')}
        </Text>
        {/* One line: Figma's column fits "9:30 AM", so a two-digit hour shrinks slightly instead of wrapping. */}
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.time, sizes.time]}>
          {formatClockTime(checkpoint.scheduledAt)}
        </Text>
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
          {checkpoint.status === 'completed' && !isSos && (
            <AppIcon name="check" size={sizes.checkIcon} color={colors.onPrimary} />
          )}
        </View>
        <View style={[styles.railLine, isLast && styles.railLineHidden]} />
      </View>

      <View style={[styles.card, sizes.card, { backgroundColor: look.cardBg, borderColor: look.cardBorder }]}>
        <View style={styles.topLine}>
          <View style={styles.flex1}>
            <View style={styles.chipRow}>
              {isSos && (
                <View style={[styles.sosBadge, sizes.sosBadge]}>
                  <DangerTriangleIcon size={sizes.sosIcon} color={colors.onPrimary} />
                  <Text style={[styles.sosText, sizes.sosText]}>{t('timeline.sosBadge')}</Text>
                </View>
              )}
              <View style={[styles.chip, sizes.chip, { backgroundColor: look.chipBg }]}>
                <Text style={[styles.chipText, sizes.chipText, { color: look.chipText }]}>
                  {t(`timeline.status.${checkpoint.status}`).toUpperCase()}
                </Text>
              </View>
            </View>

            {checkpoint.status === 'completed' && (
              <View style={[styles.completedBodyRow, sizes.bodyGap]}>
                <Text style={bodyStyle}>{t(BODY_KEY.completed[isSos ? 'sos' : 'normal'])}</Text>
                {checkpoint.recordedAt && (
                  <Text style={bodyStyle}>
                    {t('timeline.checkpoint.completedRecordedAt', { time: formatClockTime(checkpoint.recordedAt) })}
                  </Text>
                )}
              </View>
            )}

            {(checkpoint.status === 'missed' || checkpoint.status === 'dueNow') && (
              <Text style={[bodyStyle, sizes.bodyGap]}>{t(BODY_KEY[checkpoint.status][isSos ? 'sos' : 'normal'])}</Text>
            )}

            {checkpoint.status === 'upcoming' && (
              <Text style={[bodyStyle, styles.upcomingBody, sizes.bodyGap]}>
                {t('timeline.checkpoint.upcomingBody', {
                  time: formatClockTime(checkpoint.scheduledAt),
                  minutes: minutesUntil(checkpoint.scheduledAt),
                })}
              </Text>
            )}
          </View>

          {checkpoint.status === 'upcoming' && <LockKeyholeBadgeIcon size={sizes.lockBadge} />}
          {/* Android's edit button (TimelineAdapter ivEdit): the newest submitted card while it can still be edited. */}
          {checkpoint.showEditIcon && (
            <Pressable
              onPress={onOpen}
              accessibilityRole="button"
              accessibilityLabel={t('timeline.a11y.editCard')}
              hitSlop={12}
              testID={LABOUR_TEST_IDS.timeline.editIcon}
            >
              <AppIcon name="edit" size={sizes.lockBadge} color={colors.primary} />
            </Pressable>
          )}
        </View>

        {/* Record Now opens an empty card, Show a submitted one; only for the visit holder, as Android. */}
        {openLabelKey && (
          <AppButton
            label={t(openLabelKey)}
            onPress={onOpen}
            size="compact"
            showChevron
            gradient={openLabelKey === 'timeline.checkpoint.recordNow'} // Figma Main CTA; Show stays flat
            style={sizes.buttonGap}
            testID={LABOUR_TEST_IDS.timeline.cardOpen(checkpoint.id)}
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
    width: dimens.timelineRailLine,
    backgroundColor: colors.timelineRail,
  },
  railLineHidden: {
    backgroundColor: 'transparent',
  },
  dot: {
    borderWidth: dimens.timelineDotBorder,
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
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chip: {
    justifyContent: 'center',
  },
  sosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.timelineSos,
  },
  sosText: {
    fontWeight: '700',
    color: colors.onPrimary,
  },
  chipText: {
    fontWeight: '700',
    letterSpacing: letterSpacing.caps,
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
