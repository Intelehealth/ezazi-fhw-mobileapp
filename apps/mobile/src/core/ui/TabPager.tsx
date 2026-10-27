import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useTranslation } from 'react-i18next';

import { colors, dimens, spacing } from '@/core/config/theme';

import { useControlSizes } from './hooks/useControlSizes';
import { Text } from './Text';

export interface PagerTab {
  key: string;
  label: string;
  errorCount?: number; // fields on this tab still in error, shown as "Medication (2)"
}

interface TabPagerProps {
  tabs: readonly PagerTab[];
  index: number;
  onIndexChange: (index: number) => void;
  /** One page per tab, in the same order. */
  children: React.ReactNode[];
}

/**
 * Tabs over pages moved by tapping a tab or swiping, stopping at the first and last page
 * (Figma 251:556). Tablets spread the tabs across the width; phones scroll them.
 */
export const TabPager: React.FC<TabPagerProps> = ({ tabs, index, onIndexChange, children }) => {
  const { t } = useTranslation();
  const sizes = useControlSizes();
  const pager = useRef<PagerView>(null);

  useEffect(() => {
    pager.current?.setPage(index);
  }, [index]);

  const strip = tabs.map((tab, position) => {
    const selected = position === index;
    const hasErrors = (tab.errorCount ?? 0) > 0;
    const label = hasErrors ? t('common.tabWithErrors', { label: tab.label, count: tab.errorCount }) : tab.label;
    const color = hasErrors ? colors.alertFigma : selected ? colors.primaryTextFigma : colors.tabUnselectedText;
    return (
      <Pressable
        key={tab.key}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        onPress={() => onIndexChange(position)}
        style={[styles.tab, sizes.isTablet && styles.tabSpread]}
      >
        <Text numberOfLines={1} style={[styles.tabText, { fontSize: sizes.tab, color }, selected && styles.tabTextSelected]}>
          {label}
        </Text>
        <View style={[styles.indicator, selected && styles.indicatorSelected]} />
      </Pressable>
    );
  });

  return (
    <View style={styles.container}>
      <View accessibilityRole="tablist" style={styles.strip}>
        {sizes.isTablet ? (
          <View style={styles.spread}>{strip}</View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {strip}
          </ScrollView>
        )}
      </View>
      <PagerView
        ref={pager}
        style={styles.pager}
        initialPage={index}
        onPageSelected={(event) => onIndexChange(event.nativeEvent.position)}
      >
        {children.map((page, position) => (
          <View key={tabs[position]?.key ?? position} style={styles.page}>
            {page}
          </View>
        ))}
      </PagerView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  strip: {
    borderBottomWidth: 1,
    borderBottomColor: colors.headerDividerFigma,
  },
  spread: {
    flexDirection: 'row',
  },
  tab: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  tabSpread: {
    flex: 1,
  },
  tabText: {
    paddingBottom: spacing.sm,
  },
  tabTextSelected: {
    fontWeight: '700',
  },
  indicator: {
    alignSelf: 'stretch',
    height: dimens.tabIndicator,
  },
  indicatorSelected: {
    backgroundColor: colors.tabIndicator,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
});
