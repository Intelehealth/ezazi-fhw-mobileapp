import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { colors } from '@/core/config/theme';
import { Text } from '@/core/ui/Text';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

/**
 * Anchored dropdown panel - opens directly under the field that owns it, the
 * way a native <select> does, rather than as a centred dialog.
 *
 * Generalised out of the auth LOCATION picker so the auth and patient
 * registration screens share one list. The option type is the caller's:
 * pass `keyOf` and `labelOf` to read it.
 *
 * **Do not re-declare these styles in a screen.** A screen owns the trigger
 * and the open/closed state; the panel's geometry is derived from `anchor`
 * and the window, and its look belongs here.
 *
 * Every string arrives as a prop - nothing in `core/ui` translates.
 *
 * Two rules the callers depend on, both deliberate:
 *
 * 1. The panel takes the **trigger's** width, not the screen's.
 * 2. Rows **wrap**. Never add `numberOfLines` to a row and never give a row a
 *    fixed height. In a half-width column a 15px row fits roughly fourteen
 *    characters, and real option text runs far past that - `Dadra and Nagar
 *    Haveli (UT)` is 27 and `Nawanshahr (Shahid Bhagat Singh Nagar)` is 38 -
 *    so a capped row would cut them off. A wrapped row simply grows; the
 *    height cap and the FlatList handle the rest.
 */

export interface FieldAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AppDropdownProps<T> {
  visible: boolean;
  options: T[];
  /** Stable list key for an option. */
  keyOf: (option: T) => string;
  /** The row's visible text, and its accessibility name. */
  labelOf: (option: T) => string;
  /** The trigger's on-screen box, via `measureInWindow` - null until measured. */
  anchor: FieldAnchor | null;
  onSelect: (option: T) => void;
  onClose: () => void;
  /** Spinner in place of the list. */
  isLoading?: boolean;
  /** Shown when `options` is empty and nothing is loading. */
  emptyText: string;
  /** Accessibility name for the tap-outside-to-dismiss catcher. */
  closeLabel: string;
  /** `keyOf` of the chosen option. Highlights that row. */
  selectedKey?: string;
  /** Cap on the panel's height. Clamped further by the room available. */
  maxHeight?: number;
}

const DEFAULT_MAX_HEIGHT = 260;
const DROPDOWN_GAP = 6;

export function AppDropdown<T>({
  visible,
  options,
  keyOf,
  labelOf,
  anchor,
  onSelect,
  onClose,
  isLoading = false,
  emptyText,
  closeLabel,
  selectedKey,
  maxHeight = DEFAULT_MAX_HEIGHT,
}: AppDropdownProps<T>) {
  const { cornerRadius, fs, height: windowHeight } = useResponsive();

  if (!anchor) return null;

  // Flip above the trigger when there is not enough room below it. The panel
  // only ever opened downward before, so a trigger low on a short screen
  // opened a panel that ran off the bottom. Either way the height is clamped
  // to the room actually available, so it cannot overflow in one direction
  // the way it used to in the other.
  const spaceBelow = windowHeight - (anchor.y + anchor.height + DROPDOWN_GAP);
  const spaceAbove = anchor.y - DROPDOWN_GAP;
  const flipUp = spaceBelow < Math.min(maxHeight, spaceAbove);

  const placement = flipUp
    ? {
        bottom:    windowHeight - anchor.y + DROPDOWN_GAP,
        maxHeight: Math.min(maxHeight, spaceAbove),
      }
    : {
        top:       anchor.y + anchor.height + DROPDOWN_GAP,
        maxHeight: Math.min(maxHeight, spaceBelow),
      };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Fully transparent - this is a dropdown anchored to a field, not a
          dialog, so the rest of the screen isn't dimmed. It only catches the
          "tap outside to dismiss" gesture.

          Labelled but deliberately NOT given accessibilityRole="button": it is
          a scrim, not a control, and as the rows' ancestor a button role here
          makes every row also match a by-role query for that row's name. */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onClose}
        accessibilityLabel={closeLabel}
      >
        <TouchableWithoutFeedback>
          <View
            testID="app-dropdown-panel"
            style={[
              styles.panel,
              placement,
              { left: anchor.x, width: anchor.width, borderRadius: cornerRadius },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator style={styles.stateBox} color={colors.primary} />
            ) : options.length === 0 ? (
              <Text style={[styles.stateBox, styles.emptyText]}>{emptyText}</Text>
            ) : (
              <FlatList
                data={options}
                keyExtractor={keyOf}
                style={styles.list}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                renderItem={({ item }) => {
                  const isSelected =
                    selectedKey !== undefined && keyOf(item) === selectedKey;
                  return (
                    <TouchableOpacity
                      style={[styles.row, isSelected && styles.rowSelected]}
                      onPress={() => onSelect(item)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={labelOf(item)}
                    >
                      <Text
                        style={[
                          styles.rowText,
                          { fontSize: fs('option') },
                          isSelected && styles.rowTextSelected,
                        ]}
                      >
                        {labelOf(item)}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
}

// --- Styles -----------------------------------------------------------------
const styles = StyleSheet.create({
  panel: {
    position:        'absolute',
    backgroundColor: colors.white,
    borderWidth:     1,
    borderColor:     colors.inputBorder,
    overflow:        'hidden',
    elevation:       6,
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
    paddingVertical: 20,
  },

  emptyText: {
    color:             colors.textSecondary,
    textAlign:         'center',
    paddingHorizontal: 16,
  },

  list: {
    flexGrow: 0,
  },

  // No height here, and no `numberOfLines` on the text below - see the rule
  // in this file's header.
  row: {
    paddingHorizontal: 14,
    paddingVertical:   14,
  },

  rowSelected: {
    backgroundColor: colors.inputBg,
  },

  rowText: {
    color: colors.textPrimary,
  },

  rowTextSelected: {
    color: colors.primary,
  },

  separator: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
