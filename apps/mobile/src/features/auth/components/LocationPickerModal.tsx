import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, dimens, fontSizes, spacing } from '@/core/config/theme';
import { Text } from '@/core/ui/Text';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import type { LoginLocation } from '@/features/auth/stores/location.store';

/**
 * LOCATION field dropdown for SetupScreen — anchored directly under the
 * field (not a centered dialog), matching a native <select>/autocomplete.
 * List is fetched from locationApi — same "Login Location"-tagged set the
 * legacy SetupActivity dropdown used.
 */

export interface FieldAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LocationPickerModalProps {
  visible: boolean;
  locations: LoginLocation[];
  isLoading: boolean;
  /** Field's on-screen position (via measureInWindow) — null until known. */
  anchor: FieldAnchor | null;
  onSelect: (location: LoginLocation) => void;
  onClose: () => void;
  /** QA locator of the list; each option is `<testID>-option-<uuid>`. */
  testID?: string;
}

const MAX_DROPDOWN_HEIGHT = dimens.locationDropdownMaxHeight;
const DROPDOWN_GAP = dimens.locationDropdownGap;

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  testID,
  visible,
  locations,
  isLoading,
  anchor,
  onSelect,
  onClose,
}) => {
  const { t } = useTranslation();
  const { cornerRadius } = useResponsive();

  if (!anchor) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Fully transparent — this is a dropdown anchored to the field, not a
          dialog, so the rest of the screen isn't dimmed. Only catches the
          "tap outside to dismiss" gesture. */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onClose}
        accessibilityLabel={t('common.a11y.goBack')}
      >
        <TouchableWithoutFeedback>
          <View
            style={[
              styles.dropdown,
              {
                top:          anchor.y + anchor.height + DROPDOWN_GAP,
                left:         anchor.x,
                width:        anchor.width,
                maxHeight:    MAX_DROPDOWN_HEIGHT,
                borderRadius: cornerRadius,
              },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator style={styles.stateBox} color={colors.primary} />
            ) : locations.length === 0 ? (
              <Text style={[styles.stateBox, styles.emptyText]}>
                {t('setup.errors.locationsNotFetched')}
              </Text>
            ) : (
              <FlatList
                data={locations}
                keyExtractor={(item) => item.uuid}
                style={styles.list}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => onSelect(item)}
                    accessibilityRole="button"
                    accessibilityLabel={item.display}
                    testID={testID && `${testID}-option-${item.uuid}`}
                  >
                    <Text style={styles.rowText}>{item.display}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  dropdown: {
    position:         'absolute',
    backgroundColor:  colors.white,
    borderWidth:      1,
    borderColor:      colors.inputBorder,
    overflow:         'hidden',
    elevation:        6,
    ...Platform.select({
      ios: {
        shadowColor:   colors.black,
        shadowOffset:  { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius:  6,
      },
    }),
  },

  stateBox: {
    paddingVertical: dimens.locationStatePad,
  },

  emptyText: {
    color:             colors.textSecondary,
    textAlign:         'center',
    paddingHorizontal: spacing.md,
  },

  list: {
    flexGrow: 0,
  },

  row: {
    paddingHorizontal: dimens.locationRowPad,
    paddingVertical:   dimens.locationRowPad,
  },

  rowText: {
    color:    colors.textPrimary,
    fontSize: fontSizes.locationOption.phone,
  },

  separator: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
