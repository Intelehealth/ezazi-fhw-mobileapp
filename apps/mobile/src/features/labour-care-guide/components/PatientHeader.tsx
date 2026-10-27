import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '@/core/ui/Text';
import { AppIcon, type IconName } from '@/core/ui/icons';
import { colors, dimens, spacing } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import type { PatientSummary } from '../domain/timeline.types';

/** Timeline: close on the right (Figma 251:365). Capture: back on the left (Figma 251:559). */
export type HeaderNavigation = 'close' | 'back';

interface PatientHeaderProps {
  /** Null while the patient is read: the bar keeps its buttons and height. */
  patient: PatientSummary | null;
  navigation: HeaderNavigation;
  onNavigate: () => void;
  onViewLcg: () => void;
  onViewPostpartumReport: () => void;
}

type ShortcutKey = 'viewLcg' | 'postpartumReport';

// Labels and accessibility text come from `timeline.<key>` / `timeline.a11y.<key>`.
const SHORTCUTS: readonly { key: ShortcutKey; icon: IconName }[] = [
  { key: 'viewLcg', icon: 'document' },
  { key: 'postpartumReport', icon: 'report' },
];

/**
 * Patient identity strip + LCG/Postpartum Report shortcuts + the back or close button.
 * Tablet follows Figma 251:365 / 251:559 (Figma units via fromFigma): everything in one row.
 * Phone has no room for that row, so the shortcuts sit under the name.
 */
export const PatientHeader: React.FC<PatientHeaderProps> = ({
  patient,
  navigation,
  onNavigate,
  onViewLcg,
  onViewPostpartumReport,
}) => {
  const { t } = useTranslation();
  const { isTablet, fs, fromFigma } = useResponsive();

  // The app draws edge to edge, so the header starts below the status bar's inset.
  const statusBarH = useSafeAreaInsets().top;
  const onPress: Record<ShortcutKey, () => void> = { viewLcg: onViewLcg, postpartumReport: onViewPostpartumReport };
  const pillIconSize = isTablet ? fromFigma(24) : 16;
  const pillStyle = isTablet
    ? { height: fromFigma(50), paddingHorizontal: fromFigma(12), gap: fromFigma(9), borderRadius: fromFigma(15) }
    : styles.pillPhone;
  const pillLabelSize = isTablet ? fromFigma(16) : fs('timelineCardLabel');

  const navSize = isTablet ? fromFigma(52) : dimens.headerNavButton;
  const backButton = (
    <TouchableOpacity
      onPress={onNavigate}
      accessibilityRole="button"
      accessibilityLabel={t('timeline.a11y.back')}
      style={[styles.navBtn, styles.backBtn, { width: navSize, height: navSize, borderRadius: navSize / 2 }]}
      activeOpacity={0.7}
    >
      <AppIcon
        name="chevronLeft"
        size={isTablet ? fromFigma(24) : dimens.headerNavIcon}
        color={colors.primaryTextDarkFigma}
      />
    </TouchableOpacity>
  );

  const shortcuts = (
    <View style={[styles.actionRow, isTablet ? { gap: fromFigma(14) } : styles.actionRowPhone]}>
      {SHORTCUTS.map(({ key, icon }) => (
        <TouchableOpacity
          key={key}
          onPress={onPress[key]}
          accessibilityRole="button"
          accessibilityLabel={t(`timeline.a11y.${key}`)}
          style={[styles.pill, pillStyle]}
          activeOpacity={0.8}
        >
          <AppIcon name={icon} size={pillIconSize} color={colors.primary} />
          <Text style={[styles.pillLabel, { fontSize: pillLabelSize }]} numberOfLines={1}>
            {t(`timeline.${key}`)}
          </Text>
        </TouchableOpacity>
      ))}
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
        {navigation === 'back' && backButton}

        <View style={styles.identity}>
          {patient && (
            <>
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
                {t('timeline.identityLine', { ezId: patient.ezId, age: patient.ageYears, gravida: patient.gravidaLabel })}
              </Text>
            </>
          )}
        </View>

        {isTablet && shortcuts}

        {navigation === 'close' && (
          <TouchableOpacity
            onPress={onNavigate}
            accessibilityRole="button"
            accessibilityLabel={t('timeline.a11y.close')}
            style={[styles.navBtn, isTablet && { width: fromFigma(45), height: fromFigma(45) }]}
            activeOpacity={0.7}
          >
            {/* The glyph fills 14/24 of its box: 43 units puts it at the frame's ~25-unit cross. */}
            <AppIcon name="close" size={isTablet ? fromFigma(43) : 26} color={colors.primaryTextDarkFigma} />
          </TouchableOpacity>
        )}
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
  navBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    borderWidth: 1,
    borderColor: colors.borderFigma,
    backgroundColor: colors.headerPillBg,
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
