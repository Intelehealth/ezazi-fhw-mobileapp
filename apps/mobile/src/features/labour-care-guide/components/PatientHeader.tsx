import React from 'react';
import { Platform, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/core/ui/Text';
import { AppIcon } from '@/core/ui/icons';
import { colors, radii, spacing } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import type { PatientSummary } from '../domain/timeline.types';

interface PatientHeaderProps {
  patient: PatientSummary;
  onViewLcg: () => void;
  onViewPostpartumReport: () => void;
  onClose: () => void;
}

/** Patient identity strip + LCG/Postpartum Report shortcuts + close button. */
export const PatientHeader: React.FC<PatientHeaderProps> = ({
  patient,
  onViewLcg,
  onViewPostpartumReport,
  onClose,
}) => {
  const { t } = useTranslation();
  const { isTablet, fs, scale } = useResponsive();

  // Same status-bar offset ScreenHeader uses — there's no established
  // useSafeAreaInsets() usage in this codebase yet (see TimelineActionBar
  // for where one is finally introduced, at the bottom bar).
  const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;
  const iconSize = isTablet ? scale(18) : 16;

  return (
    <View style={[styles.container, { paddingTop: statusBarH + spacing.md }]}>
      <View style={styles.topRow}>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {patient.name}
          </Text>
          <Text style={[styles.subline, { fontSize: fs('timelineDate') }]} numberOfLines={1}>
            {patient.ezId} · {t('timeline.ageGravida', { age: patient.ageYears, gravida: patient.gravidaLabel })}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('timeline.a11y.close')}
          style={styles.closeBtn}
          activeOpacity={0.7}
        >
          <AppIcon name="close" size={iconSize + 4} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={onViewLcg}
          accessibilityRole="button"
          accessibilityLabel={t('timeline.a11y.viewLcg')}
          style={styles.pillButton}
          activeOpacity={0.8}
        >
          <AppIcon name="document" size={iconSize} color={colors.primary} />
          <Text style={[styles.pillLabel, { fontSize: fs('timelineCardLabel') }]} numberOfLines={1}>
            {t('timeline.viewLcg')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onViewPostpartumReport}
          accessibilityRole="button"
          accessibilityLabel={t('timeline.a11y.postpartumReport')}
          style={styles.pillButton}
          activeOpacity={0.8}
        >
          <AppIcon name="report" size={iconSize} color={colors.primary} />
          <Text style={[styles.pillLabel, { fontSize: fs('timelineCardLabel') }]} numberOfLines={1}>
            {t('timeline.postpartumReport')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subline: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pillLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
});
