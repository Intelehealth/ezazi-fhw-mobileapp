import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import dayjs, { type Dayjs } from 'dayjs';
import { colors, radii, spacing } from '@/core/config/theme';
import { AppIcon } from './icons';
import { Text } from './Text';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

/**
 * THE date picker — a Gregorian calendar modal, pure JS, no native module and
 * no Bikram Sambat branch. It is the MODAL ONLY: the caller renders its own
 * trigger, so core/ui never learns what a registration field looks like.
 * A day tap only stages the date; Confirm is what reports it.
 */
interface AppDatePickerProps {
  visible: boolean;
  value?: Date | null;
  onChange: (date: Date) => void;
  onClose: () => void;
  /** Hard floor. A pure-JS picker inherits no framework default. */
  minDate: Date;
  maxDate: Date;
  /** dayjs tokens, e.g. 'DD-MM-YY'. Not formatDate — that carries the BS branch. */
  displayFormat: string;
  /** core/ui does not translate; the caller passes t('common.cancel'). */
  cancelLabel: string;
  /** t('common.confirm'). */
  confirmLabel: string;
}

const DAYS_IN_WEEK = 7;
const YEARS_PER_ROW = 4;

const chunk = <T,>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, i * size + size),
  );

export const AppDatePicker: React.FC<AppDatePickerProps> = ({
  visible,
  value,
  onChange,
  onClose,
  minDate,
  maxDate,
  displayFormat,
  cancelLabel,
  confirmLabel,
}) => {
  const { fs, cornerRadius } = useResponsive();
  const min = dayjs(minDate).startOf('day');
  const max = dayjs(maxDate).startOf('day');

  const [cursor, setCursor] = useState<Dayjs>(max);
  const [pending, setPending] = useState<Dayjs | null>(null);
  const [pickingYear, setPickingYear] = useState(false);

  // A typed age can back-date below the floor, so the opening month is clamped
  // rather than trusted — reopening then lands on the floor, not on the value.
  useEffect(() => {
    if (!visible) return;
    const picked = value ? dayjs(value).startOf('day') : null;
    const wanted = picked ?? max;
    setCursor(wanted.isBefore(min) ? min : wanted.isAfter(max) ? max : wanted);
    setPending(picked);
    setPickingYear(false);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const weekdays = useMemo(
    () => Array.from({ length: DAYS_IN_WEEK }, (_, i) => dayjs().day(i).format('dd')),
    [],
  );

  const weeks = useMemo(() => {
    const first = cursor.startOf('month');
    const cells: (Dayjs | null)[] = [
      ...Array.from({ length: first.day() }, () => null),
      ...Array.from({ length: cursor.daysInMonth() }, (_, i) => first.add(i, 'day')),
    ];
    while (cells.length % DAYS_IN_WEEK !== 0) cells.push(null);
    return chunk(cells, DAYS_IN_WEEK);
  }, [cursor]);

  const years = useMemo(
    () =>
      chunk(
        Array.from({ length: max.year() - min.year() + 1 }, (_, i) => min.year() + i),
        YEARS_PER_ROW,
      ),
    [min, max],
  );

  const canGoBack = cursor.startOf('month').isAfter(min.startOf('month'));
  const canGoForward = cursor.startOf('month').isBefore(max.startOf('month'));
  const isSelectable = (d: Dayjs) => !d.isBefore(min, 'day') && !d.isAfter(max, 'day');

  const pickYear = (year: number) => {
    const moved = cursor.year(year);
    setCursor(moved.isBefore(min) ? min : moved.isAfter(max) ? max : moved);
    setPickingYear(false);
  };

  const confirm = () => {
    if (!pending) return;
    onChange(pending.toDate());
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { borderRadius: cornerRadius }]}>
          <View style={styles.header}>
            <Text style={[styles.headerDate, { fontSize: fs('heading') }]}>
              {pending ? pending.format(displayFormat) : displayFormat}
            </Text>
          </View>

          <View style={styles.monthBar}>
            <TouchableOpacity
              onPress={() => setCursor(cursor.subtract(1, 'month'))}
              disabled={!canGoBack}
              accessibilityRole="button"
              accessibilityLabel={cursor.subtract(1, 'month').format('MMMM YYYY')}
              accessibilityState={{ disabled: !canGoBack }}
              hitSlop={spacing.sm}
            >
              <AppIcon name="chevronLeft" size={24} color={canGoBack ? colors.textPrimary : colors.textDisabled} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPickingYear(!pickingYear)}
              accessibilityRole="button"
              accessibilityLabel={cursor.format('MMMM YYYY')}
              accessibilityState={{ expanded: pickingYear }}
            >
              <Text style={[styles.monthTitle, { fontSize: fs('heading') }]}>
                {cursor.format('MMMM YYYY')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCursor(cursor.add(1, 'month'))}
              disabled={!canGoForward}
              accessibilityRole="button"
              accessibilityLabel={cursor.add(1, 'month').format('MMMM YYYY')}
              accessibilityState={{ disabled: !canGoForward }}
              hitSlop={spacing.sm}
            >
              <View style={styles.flip}>
                <AppIcon name="chevronLeft" size={24} color={canGoForward ? colors.textPrimary : colors.textDisabled} />
              </View>
            </TouchableOpacity>
          </View>

          {pickingYear ? (
            <ScrollView style={styles.yearScroll}>
              {years.map(row => (
                <View style={styles.row} key={row[0]}>
                  {row.map(year => (
                    <TouchableOpacity
                      key={year}
                      style={styles.cell}
                      onPress={() => pickYear(year)}
                      accessibilityRole="button"
                      accessibilityLabel={String(year)}
                      accessibilityState={{ selected: year === cursor.year() }}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          year === cursor.year() && styles.cellTextSelected,
                          { fontSize: fs('input') },
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          ) : (
            <View>
              <View style={styles.row}>
                {weekdays.map(name => (
                  <View style={styles.cell} key={name}>
                    <Text style={[styles.weekday, { fontSize: fs('error') }]}>{name}</Text>
                  </View>
                ))}
              </View>

              {weeks.map(week => (
                <View style={styles.row} key={week.find(Boolean)?.toString() ?? ''}>
                  {week.map((day, i) => {
                    if (!day) return <View style={styles.cell} key={i} />;
                    const enabled = isSelectable(day);
                    const isPending = !!pending && day.isSame(pending, 'day');
                    return (
                      <TouchableOpacity
                        key={i}
                        style={styles.cell}
                        onPress={() => setPending(day)}
                        disabled={!enabled}
                        accessibilityRole="button"
                        accessibilityLabel={day.format('D MMMM YYYY')}
                        accessibilityState={{ disabled: !enabled, selected: isPending }}
                      >
                        <View style={[styles.day, isPending && styles.daySelected]}>
                          <Text
                            style={[
                              styles.cellText,
                              !enabled && styles.cellTextDisabled,
                              isPending && styles.cellTextOnPrimary,
                              { fontSize: fs('input') },
                            ]}
                          >
                            {day.date()}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnOutline]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              <Text style={[styles.btnText, styles.btnTextOutline, { fontSize: fs('button') }]}>
                {cancelLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, pending ? styles.btnFilled : styles.btnDisabled]}
              onPress={confirm}
              disabled={!pending}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              accessibilityState={{ disabled: !pending }}
            >
              <Text
                style={[
                  styles.btnText,
                  pending ? styles.btnTextFilled : styles.btnTextDisabled,
                  { fontSize: fs('button') },
                ]}
              >
                {confirmLabel}
              </Text>
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

  headerDate: {
    color: colors.white,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },

  monthTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
  },

  // chevronLeft is the only chevron in the registry; mirroring it beats
  // hand-authoring a second path that has to stay in step with the first.
  flip: {
    transform: [{ scaleX: -1 }],
  },

  row: {
    flexDirection: 'row',
  },

  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  day: {
    width: '78%',
    aspectRatio: 1,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  daySelected: {
    backgroundColor: colors.primary,
  },

  weekday: {
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  cellText: {
    color: colors.textPrimary,
  },

  cellTextDisabled: {
    color: colors.textDisabled,
  },

  cellTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },

  cellTextOnPrimary: {
    color: colors.onPrimary,
    fontWeight: '700',
  },

  yearScroll: {
    maxHeight: 260,
  },

  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },

  btn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },

  // The divider is carried by the left button, as in PermissionDeniedDialog.
  btnOutline: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },

  btnFilled: {
    backgroundColor: colors.primary,
  },

  btnDisabled: {
    backgroundColor: colors.disabledBg,
  },

  btnText: {
    fontWeight: '600',
  },

  btnTextOutline: {
    color: colors.dialogTextMuted,
  },

  btnTextFilled: {
    color: colors.white,
  },

  btnTextDisabled: {
    color: colors.disabledText,
  },
});
