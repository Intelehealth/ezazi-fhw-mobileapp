import React from 'react';
import { Platform, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/core/ui/Text';
import { AppIcon } from '@/core/ui/icons';
import { colors, spacing } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import type { PatientSummary } from '../domain/timeline.types';

interface PatientHeaderProps {
  patient: PatientSummary;
  onViewLcg: () => void;
  onViewPostpartumReport: () => void;
  onClose: () => void;
}

/**
 * Patient identity strip + LCG/Postpartum Report shortcuts + close button.
 * Tablet follows Figma 251:365 (sizes in Figma units via fromFigma): name, shortcuts and close
 * in one row. Phone has no room for that row, so the shortcuts sit under the name.
 */
export const PatientHeader: React.FC<PatientHeaderProps> = ({
  patient,
  onViewLcg,
  onViewPostpartumReport,
  onClose,
}) => {
  const { t } = useTranslation();
  const { isTablet, fs, fromFigma } = useResponsive();

  // Same status-bar offset ScreenHeader uses — there's no established
  // useSafeAreaInsets() usage in this codebase yet (see TimelineActionBar
  // for where one is finally introduced, at the bottom bar).
  const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;
  const pillIconSize = isTablet ? fromFigma(24) : 16;
  const pillStyle = isTablet
    ? { height: fromFigma(50), paddingHorizontal: fromFigma(12), gap: fromFigma(9), borderRadius: fromFigma(15) }
    : styles.pillPhone;
  const pillLabelSize = isTablet ? fromFigma(16) : fs('timelineCardLabel');

  const shortcuts = (
    <View style={[styles.actionRow, isTablet ? { gap: fromFigma(14) } : styles.actionRowPhone]}>
      <TouchableOpacity
        onPress={onViewLcg}
        accessibilityRole="button"
        accessibilityLabel={t('timeline.a11y.viewLcg')}
        style={[styles.pill, pillStyle]}
        activeOpacity={0.8}
      >
        <AppIcon name="document" size={pillIconSize} color={colors.primary} />
        <Text style={[styles.pillLabel, { fontSize: pillLabelSize }]} numberOfLines={1}>
          {t('timeline.viewLcg')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onViewPostpartumReport}
        accessibilityRole="button"
        accessibilityLabel={t('timeline.a11y.postpartumReport')}
        style={[styles.pill, pillStyle]}
        activeOpacity={0.8}
      >
        <AppIcon name="report" size={pillIconSize} color={colors.primary} />
        <Text style={[styles.pillLabel, { fontSize: pillLabelSize }]} numberOfLines={1}>
          {t('timeline.postpartumReport')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        isTablet
          ? { paddingTop: statusBarH + fromFigma(16), paddingHorizontal: fromFigma(40) }
          : { paddingTop: statusBarH + spacing.md, paddingHorizontal: spacing.lg },
      ]}
    >
      <View style={[styles.topRow, isTablet && { gap: fromFigma(18) }]}>
        <View style={styles.identity}>
          <Text style={[styles.name, isTablet && { fontSize: fromFigma(32) }]} numberOfLines={1}>
            {patient.name}
          </Text>
          <Text
            style={[
              styles.subline,
              isTablet ? { fontSize: fromFigma(16), marginTop: fromFigma(8) } : { fontSize: fs('timelineDate') },
            ]}
            numberOfLines={1}
          >
            {patient.ezId} · {t('timeline.ageGravida', { age: patient.ageYears, gravida: patient.gravidaLabel })}
          </Text>
        </View>

        {isTablet && shortcuts}

        <TouchableOpacity
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('timeline.a11y.close')}
          style={[styles.closeBtn, isTablet && { width: fromFigma(45), height: fromFigma(45) }]}
          activeOpacity={0.7}
        >
          {/* The glyph fills 14/24 of its box: 43 units puts it at the frame's ~25-unit cross. */}
          <AppIcon name="close" size={isTablet ? fromFigma(43) : 26} color={colors.primaryTextDarkFigma} />
        </TouchableOpacity>
      </View>

      {!isTablet && shortcuts}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    letterSpacing: -0.5,
    color: colors.primaryTextDarkFigma,
  },
  subline: {
    color: colors.secondaryTextFigma,
    marginTop: spacing.xs,
  },
  closeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
  },
  actionRowPhone: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderFigma,
    backgroundColor: colors.headerPillBg,
  },
  pillPhone: {
    gap: spacing.xs,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pillLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
});
