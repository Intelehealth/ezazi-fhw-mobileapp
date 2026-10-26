import React from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

/**
 * Standard screen body — white background, gutters and scrolling. Body only:
 * the app bar comes from the navigator (navigation/screenOptions), not here.
 */

interface ScreenLayoutProps {
  children: React.ReactNode;
  /** false → children fill the body unscrolled (lists, maps, own ScrollView). */
  scroll?: boolean;
  /** Merged into the body/content style — screen-specific spacing only. */
  contentStyle?: StyleProp<ViewStyle>;
}

export const ScreenLayout: React.FC<ScreenLayoutProps> = ({
  children,
  scroll = true,
  contentStyle,
}) => {
  const { isTablet, scale } = useResponsive();
  // Edge-to-edge: the system nav/task bar overlaps the bottom unless padded out.
  const { bottom: bottomInset } = useSafeAreaInsets();

  const gutters = {
    paddingHorizontal: isTablet ? scale(30) : 20,
    paddingTop:        isTablet ? scale(26) : 20,
    paddingBottom:     (isTablet ? scale(32) : 24) + bottomInset,
  };

  if (!scroll) {
    return <View style={[styles.root, gutters, contentStyle]}>{children}</View>;
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[gutters, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.white,
  },
});
