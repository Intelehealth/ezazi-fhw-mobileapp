import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

/**
 * Pure RN OTP input — a single hidden TextInput captures keystrokes and
 * styled cells render the individual digits.
 */

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  hasError?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  hasError = false,
}) => {
  const { t } = useTranslation();
  const { isTablet, cornerRadius } = useResponsive();
  const inputRef = useRef<TextInput>(null);

  const cellH    = isTablet ? 64 : 52;
  const fontSize = isTablet ? 24 : 20;

  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  // Index of the "cursor" cell — the next empty slot
  const activeIndex = value.length < length ? value.length : -1;

  const handleChange = (text: string) => {
    onChange(text.replace(/[^0-9]/g, '').slice(0, length));
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => inputRef.current?.focus()}
      style={styles.container}
      accessibilityRole="none"
    >
      {/* Hidden input — positioned off-screen so it can still receive focus */}
      <TextInput
        ref={inputRef}
        style={styles.hidden}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        caretHidden
        accessibilityLabel={t('common.a11y.otpInput')}
      />

      <View style={[styles.row, { gap: isTablet ? 12 : 8 }]}>
        {digits.map((digit, i) => (
          <View
            key={i}
            style={[
              styles.cell,
              { height: cellH, borderRadius: cornerRadius },
              !!digit           && styles.cellFilled,
              i === activeIndex && styles.cellActive,
              hasError          && styles.cellError,
            ]}
          >
            <Text style={[styles.cellText, { fontSize }]}>{digit}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  hidden: {
    position: 'absolute',
    opacity:  0,
    width:    1,
    height:   1,
  },

  row: {
    flexDirection: 'row',
  },

  cell: {
    flex:            1,
    borderWidth:     1.5,
    borderColor:     colors.inputBorder,
    backgroundColor: colors.white,
    alignItems:      'center',
    justifyContent:  'center',
  },

  cellFilled: {
    borderColor: colors.primary,
  },

  cellActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },

  cellError: {
    borderColor: colors.error,
  },

  cellText: {
    color:      colors.textPrimary,
    fontWeight: '700',
  },
});
