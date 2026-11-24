import { useRef, useState } from 'react';
import {
  type ScrollView,
  StyleSheet,
  type TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { clientConfig } from '@/core/config/clients';
import { colors, dimens, spacing } from '@/core/config/theme';
import { AppButton } from '@/core/ui/AppButton';
import { AppDropdown, type FieldAnchor } from '@/core/ui/AppDropdown';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { AppIcon } from '@/core/ui/icons';
import { PatientRegistrationButton } from '@/features/patient/components/PatientRegistrationButton';
import { RegistrationStepLayout } from '@/features/patient/components/RegistrationStepLayout';
import { RegistrationTextField } from '@/features/patient/components/RegistrationTextField';
import { HAS_DISTRICT } from './addressLayoutSeam';

/**
 * Step 2 of patient registration - the address details.
 *
 * LAYOUT ONLY. There is no form state here yet: every field is rendered
 * through `RegistrationTextField` already holding the three props the code
 * chat drives, as literal placeholders:
 *
 *     value={''}  onChangeText={() => {}}  error={undefined}
 *
 * The code chat wraps each field in a `Controller` and replaces exactly those
 * three. Nothing else about this markup moves.
 *
 * What is real and stays: the two dropdowns' open/closed state and their
 * anchors. That is screen state, not form state - the code chat replaces only
 * each panel's `options` and its `onSelect`.
 */

interface DropdownOption {
  value: string;
  label: string;
}

/**
 * Stand-in list so the panel's look can be checked without the 150 KB asset
 * or `addressMaster.ts` existing. The long entry is deliberate: it is the
 * widest real state name, and it proves the row wraps rather than truncating.
 *
 * Code chat: replace with `listStates()` and `districtsOf(state)`.
 */
const PLACEHOLDER_OPTIONS: DropdownOption[] = [
  { value: 'Maharashtra', label: 'Maharashtra' },
  { value: 'Dadra and Nagar Haveli (UT)', label: 'Dadra and Nagar Haveli (UT)' },
];

const optionKey = (option: DropdownOption) => option.value;
const optionLabel = (option: DropdownOption) => option.label;

type Nav = NativeStackNavigationProp<RootStackParamList, 'AddPatientAddress'>;

export const PatientAddressInfoScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { isTablet, scale } = useResponsive();

  // The layout attaches this to its ScrollView. The code chat scrolls to the
  // first invalid field with it on a failed submit.
  const scrollRef = useRef<ScrollView>(null);

  // Village -> Address Line 1 -> Address Line 2 -> Postal Code. The dropdowns
  // are not focusable, so they are not in the chain.
  const address1Ref = useRef<TextInput>(null);
  const address2Ref = useRef<TextInput>(null);
  const postalCodeRef = useRef<TextInput>(null);

  // Screen state, not form state - this survives the code chat untouched.
  const stateTriggerRef = useRef<View>(null);
  const districtTriggerRef = useRef<View>(null);
  const [isStatePickerOpen, setStatePickerOpen] = useState(false);
  const [isDistrictPickerOpen, setDistrictPickerOpen] = useState(false);
  const [stateAnchor, setStateAnchor] = useState<FieldAnchor | null>(null);
  const [districtAnchor, setDistrictAnchor] = useState<FieldAnchor | null>(null);

  const openStatePicker = () => {
    stateTriggerRef.current?.measureInWindow((x, y, width, height) => {
      setStateAnchor({ x, y, width, height });
      setStatePickerOpen(true);
    });
  };

  const openDistrictPicker = () => {
    districtTriggerRef.current?.measureInWindow((x, y, width, height) => {
      setDistrictAnchor({ x, y, width, height });
      setDistrictPickerOpen(true);
    });
  };

  // The size token, not a literal, and the same one the personal screen reads
  // for its calendar glyph - the two registration screens' field icons have to
  // match, and auth's flat 20 belongs to a different skin.
  const fieldIcon = isTablet
    ? scale(dimens.registrationFieldIcon.tablet)
    : dimens.registrationFieldIcon.phone;

  const chevron = (color: string) => (
    <AppIcon name="chevronDown" size={fieldIcon} color={color} />
  );

  // Back beside Register Patient - 1 : 2.8, measured off the frame. The layout
  // owns the pinning and the bottom inset; these are just the buttons.
  const footer = (
    <View style={styles.footer}>
      <AppButton
        label={t('patient.common.back')}
        variant="outline"
        // TEMPORARY, item 5's code chat replaces this with the draft-writing
        // Back from the plan: plain navigation so the two steps are walkable.
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      />
      <PatientRegistrationButton
        label={t('patient.address.submit')}
        onPress={() => {}}
        style={styles.submitButton}
      />
    </View>
  );

  return (
    <RegistrationStepLayout
      currentStep="address"
      title={t('patient.address.title')}
      subtitle={t('patient.address.subtitle')}
      scrollRef={scrollRef}
      footer={footer}
    >
      {/* Row 1 - Country beside Province/State. */}
      <View style={styles.row}>
        <View style={styles.column}>
          {/* Not a form field and never focusable: the value comes from
              config and the save mapper writes it from there. The chevron is
              drawn because Figma draws one; tapping it does nothing.
              `disabled` greys the fill and the value — the same treatment as
              GENDER on the personal screen, per the port doc's settled
              decision 6. Not `editable={false}`: that is for fields that are
              untypeable but tappable, like the two dropdown triggers below. */}
          <RegistrationTextField
            label={t('patient.address.country')}
            value={clientConfig.countryName}
            onChangeText={() => {}}
            error={undefined}
            disabled
            pointerEvents="none"
            rightSlot={chevron(colors.textDisabled)}
          />
        </View>

        <View style={styles.column}>
          <TouchableOpacity
            ref={stateTriggerRef}
            accessibilityRole="button"
            activeOpacity={0.7}
            onPress={openStatePicker}
          >
            <RegistrationTextField
              label={t('patient.address.state')}
              required
              accessibilityLabel={t('patient.address.a11y.selectState')}
              placeholder={t('patient.address.statePlaceholder')}
              value={''}
              onChangeText={() => {}}
              error={undefined}
              editable={false}
              pointerEvents="none"
              rightSlot={chevron(colors.icon)}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Row 2 - District appears only once a state is picked; Village takes
          the whole row until it does. */}
      <View style={styles.row}>
        {HAS_DISTRICT && (
          <View style={styles.column}>
            <TouchableOpacity
              ref={districtTriggerRef}
              accessibilityRole="button"
              activeOpacity={0.7}
              onPress={openDistrictPicker}
            >
              <RegistrationTextField
                label={t('patient.address.district')}
                required
                accessibilityLabel={t('patient.address.a11y.selectDistrict')}
                placeholder={t('patient.address.districtPlaceholder')}
                value={''}
                onChangeText={() => {}}
                error={undefined}
                editable={false}
                pointerEvents="none"
                rightSlot={chevron(colors.icon)}
              />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.column}>
          <RegistrationTextField
            label={t('patient.address.village')}
            required
            placeholder={t('patient.address.villagePlaceholder')}
            value={''}
            onChangeText={() => {}}
            error={undefined}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => address1Ref.current?.focus()}
          />
        </View>
      </View>

      <RegistrationTextField
        ref={address1Ref}
        label={t('patient.address.address1')}
        placeholder={t('patient.address.address1Placeholder')}
        value={''}
        onChangeText={() => {}}
        error={undefined}
        autoCapitalize="sentences"
        returnKeyType="next"
        onSubmitEditing={() => address2Ref.current?.focus()}
      />

      <RegistrationTextField
        ref={address2Ref}
        label={t('patient.address.address2')}
        placeholder={t('patient.address.address2Placeholder')}
        value={''}
        onChangeText={() => {}}
        error={undefined}
        autoCapitalize="sentences"
        returnKeyType="next"
        onSubmitEditing={() => postalCodeRef.current?.focus()}
      />

      {/* Ends the chain. The Done key bypasses the footer button's `disabled`,
          so the code chat re-checks the in-flight guard inside the handler. */}
      <RegistrationTextField
        ref={postalCodeRef}
        label={t('patient.address.postalCode')}
        placeholder={t('patient.address.postalCodePlaceholder')}
        value={''}
        onChangeText={() => {}}
        error={undefined}
        keyboardType="number-pad"
        maxLength={clientConfig.postalCodeLength}
        returnKeyType="done"
        onSubmitEditing={() => {}}
      />

      <AppDropdown<DropdownOption>
        visible={isStatePickerOpen}
        options={PLACEHOLDER_OPTIONS}
        keyOf={optionKey}
        labelOf={optionLabel}
        anchor={stateAnchor}
        onSelect={() => setStatePickerOpen(false)}
        onClose={() => setStatePickerOpen(false)}
        emptyText={t('patient.address.statePlaceholder')}
        closeLabel={t('common.a11y.close')}
      />

      <AppDropdown<DropdownOption>
        visible={isDistrictPickerOpen}
        options={PLACEHOLDER_OPTIONS}
        keyOf={optionKey}
        labelOf={optionLabel}
        anchor={districtAnchor}
        onSelect={() => setDistrictPickerOpen(false)}
        onClose={() => setDistrictPickerOpen(false)}
        emptyText={t('patient.address.districtPlaceholder')}
        closeLabel={t('common.a11y.close')}
      />
    </RegistrationStepLayout>
  );
};

// --- Styles -----------------------------------------------------------------
// No gutter and no gap between field blocks: RegistrationStepLayout owns the
// first, and FieldLabel's own marginTop is the second.
const styles = StyleSheet.create({
  // flex-start matters: an error caption under the left field wraps to two
  // lines at half width, and without it the right field stretches to match.
  row: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.md,
  },

  column: {
    flex: 1,
  },

  footer: {
    flexDirection: 'row',
    gap:           12,
  },

  // 187 : 521 in the frame, not the 50/50 an earlier draft carried.
  backButton: {
    flex: 1,
  },

  submitButton: {
    flex: 2.8,
  },
});
