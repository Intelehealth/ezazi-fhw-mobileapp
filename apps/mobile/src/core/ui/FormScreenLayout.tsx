import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { colors, dimens } from '@/core/config/theme';

/**
 * Shared form-screen skeleton: root → header → KeyboardAvoidingView → ScrollView(children).
 * Slots keep it decoupled — this component knows nothing about specific screens.
 */

interface FormScreenLayoutProps {
  /** e.g. <ForgotPasswordHeader …/> — rendered above the keyboard-avoiding area. */
  header?: React.ReactNode;
  children: React.ReactNode;
  /** Merged into the ScrollView content style — screens pass their paddingTop here. */
  contentStyle?: StyleProp<ViewStyle>;
}

export const FormScreenLayout: React.FC<FormScreenLayoutProps> = ({
  header,
  children,
  contentStyle,
}) => (
  <View style={styles.root}>
    {header}

    <KeyboardAvoidingView
      style={styles.flex1}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex1}
        contentContainerStyle={[styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },

  flex1: { flex: 1 },

  content: {
    paddingHorizontal: dimens.screenHPad,
    paddingBottom: 48,
  },
});
