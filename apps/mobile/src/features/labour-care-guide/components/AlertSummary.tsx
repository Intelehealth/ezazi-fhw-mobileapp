import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, spacing } from '@/core/config/theme';
import { useControlSizes } from '@/core/ui/hooks/useControlSizes';
import { AppIcon } from '@/core/ui/icons';
import { Text } from '@/core/ui/Text';

import type { SummarySection } from '../domain/captureFormApi';

interface AlertSummaryProps {
  sections: readonly SummarySection[];
}

/**
 * Figma's "OBSERVATION SUMMARY" on Shared decision, showing only the alerted values
 * (decided 2026-10-23), grouped by tab. Hidden when nothing is alerted; collapses on tap.
 */
export const AlertSummary: React.FC<AlertSummaryProps> = ({ sections }) => {
  const { t } = useTranslation();
  const sizes = useControlSizes();
  const [open, setOpen] = useState(true);
  const shown = sections.filter((section) => section.items.length > 0);
  if (shown.length === 0) return null;

  return (
    <View style={[styles.card, { borderRadius: sizes.radius, gap: sizes.gap }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={styles.header}
      >
        <Text style={[styles.heading, { fontSize: sizes.label }]}>{t('capture.summary.title').toUpperCase()}</Text>
        <AppIcon name={open ? 'chevronDown' : 'chevronRight'} color={colors.icon} size={sizes.icon} />
      </Pressable>

      {open &&
        shown.map((section) => (
          <View key={section.labelKey} style={{ gap: sizes.gap }}>
            <Text style={[styles.section, { fontSize: sizes.label }]}>
              {t(section.labelKey, { defaultValue: section.androidLabel })}
            </Text>
            <View style={[styles.grid, { gap: sizes.gap }]}>
              {section.items.map((item) => (
                <View key={item.labelKey} style={[styles.tile, { borderRadius: sizes.radius }]}>
                  <Text style={[styles.tileLabel, { fontSize: sizes.label }]}>
                    {t(item.labelKey, { defaultValue: item.androidLabel }).toUpperCase()}
                  </Text>
                  <Text style={[styles.tileValue, { fontSize: sizes.text }]}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.controlSelectedBg,
    borderWidth: 1,
    borderColor: colors.borderFigma,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    color: colors.secondaryTextFigma,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  section: {
    color: colors.controlSelectedText,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.white,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  tileLabel: {
    color: colors.tabUnselectedText,
  },
  tileValue: {
    color: colors.controlAlertText,
    fontWeight: '700',
  },
});
