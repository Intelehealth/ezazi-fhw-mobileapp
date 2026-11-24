import { useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  type LayoutChangeEvent,
  type ScrollView,
  StyleSheet,
  type TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Controller, useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { RootStackParamList } from '@/navigation/types';
import { clientConfig } from '@/core/config/clients';
import { colors, dimens, spacing } from '@/core/config/theme';
import { AppButton } from '@/core/ui/AppButton';
import { AppDropdown, type FieldAnchor } from '@/core/ui/AppDropdown';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { AppIcon } from '@/core/ui/icons';
import { showToast } from '@/core/utils/toast';
import { PatientRegistrationButton } from '@/features/patient/components/PatientRegistrationButton';
import { RegistrationStepLayout } from '@/features/patient/components/RegistrationStepLayout';
import { RegistrationTextField } from '@/features/patient/components/RegistrationTextField';
import { districtsOf, listStates } from '@/features/patient/domain/addressMaster';
import {
  createAddressInfoFormSchema,
  type AddressInfoFormValues,
} from '@/features/patient/domain/addressInfoForm.schema';
import { useRegistrationDraftStore } from '@/features/patient/stores/registrationDraft.store';
import { hasDistrict } from './addressLayoutSeam';

/**
 * Step 2 of patient registration - the address details, and the save.
 *
 * React Hook Form + zod, never `useState` for a field value (tripwire 9). The
 * two dropdown panels' open/closed state IS local state and stays that way:
 * whether a panel is open is not part of the form.
 *
 * WHAT THIS SCREEN DOES NOT DO. The X, hardware back, the discard dialog and
 * everything that follows a confirmed discard belong to
 * `RegistrationStepLayout` - one owner for a path that is identical on both
 * steps (port doc, decision A). The footer's Back is a different thing: it
 * steps back one screen and is this screen's.
 *
 * Save goes screen -> store -> repository. A screen importing
 * `features/*\/data` fails `npm run lint`, so `submitRegistration` on the draft
 * store is the seam, exactly as `location.store.fetchLocations()` stands
 * between SetupScreen and `location.api.ts`.
 */

type Nav = NativeStackNavigationProp<RootStackParamList, 'AddPatientAddress'>;

type FieldName = keyof AddressInfoFormValues;

/** The blocks the card lays out, top to bottom. Two of them hold two fields. */
type BlockName = 'row1' | 'row2' | 'addressLine1' | 'addressLine2' | 'postalCode';

/**
 * Field order for scroll-to-first-error, each paired with the block it is laid
 * out in. The first two rows hold two fields each, so an error on either of
 * them scrolls to the row - the intent is "bring the bad field into view", not
 * pixel-exact alignment, and the legacy's version of this passed an absolute
 * screen Y as a content offset, which was wrong by the height of everything
 * above the scroll view.
 */
const FIELD_BLOCKS: ReadonlyArray<readonly [FieldName, BlockName]> = [
  ['state', 'row1'],
  ['district', 'row2'],
  ['village', 'row2'],
  ['addressLine1', 'addressLine1'],
  ['addressLine2', 'addressLine2'],
  ['postalCode', 'postalCode'],
];

/** So the field's label is not flush against the top edge after the scroll. */
const SCROLL_MARGIN = 12;

/**
 * A fresh form. Every field is a string, including the two that are optional -
 * `undefined` would make RHF treat them as uncontrolled.
 */
const EMPTY_ADDRESS: AddressInfoFormValues = {
  state: '',
  district: '',
  village: '',
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
};

const optionKey = (name: string) => name;

export const PatientAddressInfoScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { isTablet, scale } = useResponsive();

  const setAddress = useRegistrationDraftStore((s) => s.setAddress);
  const submitRegistration = useRegistrationDraftStore((s) => s.submitRegistration);
  const isSaving = useRegistrationDraftStore((s) => s.isSaving);
  // Read for `defaultValues`, which RHF evaluates once on mount - this is the
  // form's starting point, not a live binding. It is how Back works: step 2 is
  // popped when the user goes back, so returning to it is a fresh mount and
  // the values have to come from somewhere.
  const restoredAddress = useRegistrationDraftStore((s) => s.address);

  // Rules mirror PatientAddressInfoFragment.areValidFields() - see
  // domain/addressInfoForm.schema.ts. Recreated only when the translator
  // changes (locale switch), not on every render.
  const schema = useMemo(() => createAddressInfoFormSchema(t), [t]);
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm<AddressInfoFormValues>({
    resolver: zodResolver(schema),
    defaultValues: restoredAddress ?? EMPTY_ADDRESS,
    // Validate only on submit. RHF's default reValidateMode ('onChange') would
    // re-run the resolver on every keystroke of an already-errored field,
    // live-updating its message; the legacy validated on every keystroke with
    // rules that disagreed with its own submit rules. House pattern, same as
    // SetupScreen: this plus clearErrors on type.
    reValidateMode: 'onSubmit',
  });

  // The layout attaches this to its ScrollView. Nothing else in the app
  // scrolls programmatically, so this is the first one - a plain ref, no
  // imperative handle and no context.
  const scrollRef = useRef<ScrollView>(null);

  // Village -> Address Line 1 -> Address Line 2 -> Postal Code. The dropdowns
  // are not focusable, so they are not in the chain.
  const address1Ref = useRef<TextInput>(null);
  const address2Ref = useRef<TextInput>(null);
  const postalCodeRef = useRef<TextInput>(null);

  // A ref, not state: these are measurements, not something to render from, so
  // recording one must not cause a re-render.
  const blockOffsets = useRef<Partial<Record<BlockName, number>>>({});

  const recordOffset = (block: BlockName) => (event: LayoutChangeEvent) => {
    blockOffsets.current[block] = event.nativeEvent.layout.y;
  };

  // Screen state, not form state - whether a panel is open is not a value the
  // form holds.
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

  // ── The cascade ───────────────────────────────────────────────────────────
  const stateValue = watch('state');

  // District is RENDERED or absent - never greyed out. The same call gates the
  // schema's district rule, so the field and the rule cannot disagree, and a
  // future asset with a district-less state needs no new code.
  const showDistrict = hasDistrict(stateValue);

  // Copied out of the frozen module list because AppDropdown takes a mutable
  // array. Memoised, so that is one copy per state change rather than one per
  // render.
  const stateOptions = useMemo(() => [...listStates()], []);
  const districtOptions = useMemo(() => [...districtsOf(stateValue)], [stateValue]);

  /**
   * Picking a state clears the district - and ONLY then. The legacy cleared it
   * on every tap of the state list, including a tap on the state already
   * chosen, so re-opening the list to check what you had picked cost you the
   * district. One equality check, one less thing to redo.
   */
  const onStateSelected = (name: string) => {
    setStatePickerOpen(false);

    if (name === stateValue) return;

    setValue('state', name);
    setValue('district', '');
    clearErrors(['state', 'district']);
  };

  const onDistrictSelected = (name: string) => {
    setDistrictPickerOpen(false);
    setValue('district', name);
    clearErrors('district');
  };

  // ── Save and Back ─────────────────────────────────────────────────────────

  /**
   * Walks the fields in screen order and scrolls to the first one with an
   * error. Ported as intent, not arithmetic: the offsets are measured within
   * the scroll view by `onLayout`, where the legacy read an absolute screen Y
   * and handed it over as a content offset.
   */
  const scrollToFirstError = (formErrors: FieldErrors<AddressInfoFormValues>) => {
    const firstBad = FIELD_BLOCKS.find(([field]) => formErrors[field] !== undefined);

    if (!firstBad) return;

    const offset = blockOffsets.current[firstBad[1]];

    if (offset === undefined) return;

    scrollRef.current?.scrollTo({ y: Math.max(offset - SCROLL_MARGIN, 0), animated: true });
  };

  const onValidSubmit = async (values: AddressInfoFormValues) => {
    // Parked before the write, so a failed save leaves the draft holding what
    // the user actually typed rather than what was last parked.
    setAddress(values);

    const result = await submitRegistration();

    if (result.ok) {
      // Where a successful save lands is Home, with a success toast - item 6
      // wires it, together with the write itself. Until then the repository
      // rejects, so this branch is unreachable.
      return;
    }

    // `busy` means a save was already in flight and this call did nothing. The
    // first one is still running and will very likely succeed, so saying
    // "could not save" here would be a lie.
    if (result.reason === 'busy') return;

    // The legacy showed the user nothing on a failed save, and its failure
    // message was a hardcoded English literal. There is no banner slot in the
    // Figma footer and ApiErrorBanner is shaped for API failures, so a toast.
    showToast(t('patient.errors.saveFailed'));
  };

  /**
   * The in-flight re-check is not belt-and-braces: Postal Code's keyboard
   * "done" key reaches this handler without passing the footer button, so the
   * button's `disabled` does not cover it. The store guards again for the same
   * reason.
   */
  const handleSave = () => {
    if (isSaving) return;

    Keyboard.dismiss();
    void handleSubmit(onValidSubmit, scrollToFirstError)();
  };

  /**
   * Back steps back one screen. It does NOT validate and it does not confirm -
   * legacy behaviour, kept. Abandoning the whole registration is the X and
   * hardware back, which the step layout owns.
   *
   * It writes the draft as it stands, invalid values included: the user is
   * going to step 1 to change something and must find step 2 as they left it.
   */
  const handleBack = () => {
    setAddress(getValues());
    navigation.goBack();
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
        // Stays enabled during a save: AppButton sets borderWidth 0 on every
        // disabled button, so a disabled outline button is a flat grey block
        // rather than a greyed outline. The store's own guard makes a mid-save
        // navigation harmless.
        onPress={handleBack}
        style={styles.backButton}
      />
      <PatientRegistrationButton
        label={t('patient.address.submit')}
        onPress={handleSave}
        // Never disabled-until-valid - only while a write is in flight. The
        // disable is there to stop the second tap, which would be a primary-key
        // collision rather than a duplicate patient.
        disabled={isSaving}
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
      <View style={styles.row} onLayout={recordOffset('row1')}>
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
            {/* No `onChangeText`: the trigger is not typeable, so it never
                fires. The panel's onSelect writes the value. */}
            <Controller
              control={control}
              name="state"
              render={({ field: { value } }) => (
                <RegistrationTextField
                  label={t('patient.address.state')}
                  required
                  accessibilityLabel={t('patient.address.a11y.selectState')}
                  placeholder={t('patient.address.statePlaceholder')}
                  value={value}
                  error={errors.state?.message}
                  editable={false}
                  pointerEvents="none"
                  rightSlot={chevron(colors.icon)}
                />
              )}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Row 2 - District appears only once a state is picked; Village takes
          the whole row until it does. */}
      <View style={styles.row} onLayout={recordOffset('row2')}>
        {showDistrict && (
          <View style={styles.column}>
            <TouchableOpacity
              ref={districtTriggerRef}
              accessibilityRole="button"
              activeOpacity={0.7}
              onPress={openDistrictPicker}
            >
              <Controller
                control={control}
                name="district"
                render={({ field: { value } }) => (
                  <RegistrationTextField
                    label={t('patient.address.district')}
                    required
                    accessibilityLabel={t('patient.address.a11y.selectDistrict')}
                    placeholder={t('patient.address.districtPlaceholder')}
                    value={value}
                    error={errors.district?.message}
                    editable={false}
                    pointerEvents="none"
                    rightSlot={chevron(colors.icon)}
                  />
                )}
              />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.column}>
          <Controller
            control={control}
            name="village"
            render={({ field: { value, onChange } }) => (
              <RegistrationTextField
                label={t('patient.address.village')}
                required
                placeholder={t('patient.address.villagePlaceholder')}
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  if (errors.village) clearErrors('village');
                }}
                error={errors.village?.message}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => address1Ref.current?.focus()}
              />
            )}
          />
        </View>
      </View>

      {/* The three full-width fields each sit in a plain View so `onLayout`
          measures the BLOCK. RegistrationTextField spreads the rest of its
          props onto its TextInput, so an onLayout passed to it would measure
          the input instead, whose y inside its own row is always ~0. */}
      <View onLayout={recordOffset('addressLine1')}>
        <Controller
          control={control}
          name="addressLine1"
          render={({ field: { value, onChange } }) => (
            <RegistrationTextField
              ref={address1Ref}
              label={t('patient.address.address1')}
              placeholder={t('patient.address.address1Placeholder')}
              value={value}
              onChangeText={onChange}
              error={errors.addressLine1?.message}
              autoCapitalize="sentences"
              returnKeyType="next"
              onSubmitEditing={() => address2Ref.current?.focus()}
            />
          )}
        />
      </View>

      <View onLayout={recordOffset('addressLine2')}>
        <Controller
          control={control}
          name="addressLine2"
          render={({ field: { value, onChange } }) => (
            <RegistrationTextField
              ref={address2Ref}
              label={t('patient.address.address2')}
              placeholder={t('patient.address.address2Placeholder')}
              value={value}
              onChangeText={onChange}
              error={errors.addressLine2?.message}
              autoCapitalize="sentences"
              returnKeyType="next"
              onSubmitEditing={() => postalCodeRef.current?.focus()}
            />
          )}
        />
      </View>

      {/* Ends the chain. The Done key bypasses the footer button's `disabled`,
          so handleSave re-checks the in-flight guard itself. */}
      <View onLayout={recordOffset('postalCode')}>
        <Controller
          control={control}
          name="postalCode"
          render={({ field: { value, onChange } }) => (
            <RegistrationTextField
              ref={postalCodeRef}
              label={t('patient.address.postalCode')}
              placeholder={t('patient.address.postalCodePlaceholder')}
              value={value}
              onChangeText={(text) => {
                onChange(text);
                if (errors.postalCode) clearErrors('postalCode');
              }}
              error={errors.postalCode?.message}
              keyboardType="number-pad"
              maxLength={clientConfig.postalCodeLength}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          )}
        />
      </View>

      <AppDropdown<string>
        visible={isStatePickerOpen}
        options={stateOptions}
        keyOf={optionKey}
        labelOf={optionKey}
        anchor={stateAnchor}
        onSelect={onStateSelected}
        onClose={() => setStatePickerOpen(false)}
        emptyText={t('patient.address.statePlaceholder')}
        closeLabel={t('common.a11y.close')}
      />

      <AppDropdown<string>
        visible={isDistrictPickerOpen}
        options={districtOptions}
        keyOf={optionKey}
        labelOf={optionKey}
        anchor={districtAnchor}
        onSelect={onDistrictSelected}
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
