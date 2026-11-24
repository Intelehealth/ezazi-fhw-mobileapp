import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Controller, useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { colors, dimens, spacing } from '@/core/config/theme';
import { capturePhoto, type PhotoSource } from '@/core/services/photo';
import { AppDatePicker } from '@/core/ui/AppDatePicker';
import { AppIcon } from '@/core/ui/icons';
import { PhotoSourceDialog } from '@/core/ui/PhotoSourceDialog';
import { Text } from '@/core/ui/Text';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import {
  createPersonalInfoFormSchema,
  type PersonalInfoFormValues,
} from '../domain/personalInfoForm.schema';
import { useRegistrationDraftStore } from '../stores/registrationDraft.store';
import { PatientRegistrationButton } from '../components/PatientRegistrationButton';
import { ProfilePhotoField } from '../components/ProfilePhotoField';
import { RegistrationStepLayout } from '../components/RegistrationStepLayout';
import { RegistrationTextField } from '../components/RegistrationTextField';

/**
 * Step 1 of registration. Nothing here touches the database: the valid half
 * goes to the draft store and the address step saves both.
 *
 * The discard path is NOT here — RegistrationStepLayout owns the X, hardware
 * back, the photo delete and the exit, on both steps.
 */

/** The picker's bounds. */
const DOB_FLOOR = new Date(1970, 0, 1);
const MIN_AGE_YEARS = 13;

/** Shown in the field. The two formats never meet: only the stored one leaves this screen. */
const DOB_DISPLAY_FORMAT = 'DD-MM-YY';
/** Stored in the form, the draft and date_of_birth. */
const DOB_STORAGE_FORMAT = 'YYYY-MM-DD';

const AGE_MAX_DIGITS = 2;
const MOBILE_MAX_DIGITS = 10;

/**
 * Walked in display order on a failed submit; the first one with an error is
 * scrolled to and focused. MIDDLE NAME is absent because it cannot fail.
 */
const ERROR_ORDER = [
  'firstName',
  'lastName',
  'dateOfBirth',
  'age',
  'mobileNumber',
  'alternateMobileNumber',
] as const;

type ErrorField = (typeof ERROR_ORDER)[number];

const EMPTY_FORM: PersonalInfoFormValues = {
  photoPath: null,
  firstName: '',
  middleName: '',
  lastName: '',
  dateOfBirth: '',
  age: '',
  mobileNumber: '',
  alternateMobileNumber: '',
};

/** The legacy's android:digits, which a numeric keyboard alone does not enforce on a paste. */
const digitsOnly = (text: string, max: number) => text.replace(/[^0-9]/g, '').slice(0, max);

type Nav = NativeStackNavigationProp<RootStackParamList, 'AddPatientPersonal'>;

export const PatientPersonalInfoScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { fs, isTablet, scale } = useResponsive();

  const scrollRef = useRef<ScrollView>(null);
  const firstNameRef = useRef<TextInput>(null);
  const middleNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const ageRef = useRef<TextInput>(null);
  const mobileRef = useRef<TextInput>(null);
  const alternateMobileRef = useRef<TextInput>(null);

  const [photoDialogVisible, setPhotoDialogVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const patientUuid = useRegistrationDraftStore((s) => s.patientUuid);
  const startRegistration = useRegistrationDraftStore((s) => s.startRegistration);
  const setPersonal = useRegistrationDraftStore((s) => s.setPersonal);

  /**
   * Mints the patient uuid, once, on entry to the flow — the photo file is
   * named after it. Home only navigates: `features/home/` cannot import this
   * store, and eslint is what says so.
   *
   * IDEMPOTENT IN THE STORE, not here. A second create call returns without
   * replacing the uuid, which would orphan a photo already written under the
   * first one.
   */
  useEffect(() => {
    startRegistration({ mode: 'create' });
  }, [startRegistration]);

  // Rebuilt on a locale change, not on every render — the same move SetupScreen makes.
  const schema = useMemo(() => createPersonalInfoFormSchema(t), [t]);

  /**
   * Read once, deliberately unsubscribed: coming Back from step 2 re-fills the
   * fields from the draft, and RHF reads defaultValues at mount only.
   */
  const defaultValues = useMemo<PersonalInfoFormValues>(
    () => useRegistrationDraftStore.getState().personal ?? EMPTY_FORM,
    [],
  );

  const {
    control,
    handleSubmit,
    setValue,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm<PersonalInfoFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    // Errors clear on type and never re-appear until the next submit. The
    // legacy validated on every keystroke with rules that disagreed with its
    // own submit rules; this is the house pattern instead.
    reValidateMode: 'onSubmit',
  });

  /**
   * Render-only. The forbidden shape is `watch` plus a `useEffect` that writes
   * back — that is the loop the legacy needed its `isSyncing` flag for. Reading
   * the value to draw the field and to seed the picker re-enters nothing.
   */
  const dateOfBirth = watch('dateOfBirth');

  const dobCeiling = useMemo(() => dayjs().subtract(MIN_AGE_YEARS, 'year').toDate(), []);
  const fieldIcon = isTablet
    ? scale(dimens.registrationFieldIcon.tablet)
    : dimens.registrationFieldIcon.phone;

  /**
   * Where each field sits inside the scrolling card, filled by onLayout.
   * The legacy passed an absolute screen Y as a scroll offset, which is wrong;
   * this ports the intent, not the arithmetic.
   */
  const fieldOffsets = useRef<Partial<Record<ErrorField, number>>>({});
  const rememberOffset =
    (...fields: ErrorField[]) =>
    (event: LayoutChangeEvent) => {
      const { y } = event.nativeEvent.layout;
      fields.forEach((field) => {
        fieldOffsets.current[field] = y;
      });
    };

  // DATE OF BIRTH has no focus target — it is read-only and opens the picker.
  const fieldRefs: Record<ErrorField, React.RefObject<TextInput | null> | null> = {
    firstName: firstNameRef,
    lastName: lastNameRef,
    dateOfBirth: null,
    age: ageRef,
    mobileNumber: mobileRef,
    alternateMobileNumber: alternateMobileRef,
  };

  const onInvalidSubmit = (submitted: FieldErrors<PersonalInfoFormValues>) => {
    const first = ERROR_ORDER.find((field) => submitted[field] !== undefined);
    if (first === undefined) return;

    scrollRef.current?.scrollTo({ y: fieldOffsets.current[first] ?? 0, animated: true });
    fieldRefs[first]?.current?.focus();
  };

  const onValidSubmit = (values: PersonalInfoFormValues) => {
    setPersonal(values);
    navigation.navigate('AddPatientAddress');
  };

  /**
   * Direction 1 — the picker fills AGE.
   *
   * No minimum-age check: the picker's maxDate is today - 13 years, so a
   * younger date cannot be chosen. The legacy guards again here because its
   * Bikram Sambat wheel could return one; this screen is Gregorian only.
   * AppDatePicker closes itself on confirm.
   */
  const onDateConfirmed = (picked: Date) => {
    const chosen = dayjs(picked);
    setValue('dateOfBirth', chosen.format(DOB_STORAGE_FORMAT));
    setValue('age', String(dayjs().diff(chosen, 'year')));
    clearErrors(['dateOfBirth', 'age']);
  };

  /**
   * Direction 2 — typing an age back-dates the birth date to today's
   * anniversary N years ago. That overwrites a real birth date with an
   * anniversary, which is exactly what the legacy does.
   *
   * No >= 13 check: typing "1" on the way to "13" must not flash an error.
   * A typed age may back-date below the picker's 1970 floor; the typed value
   * still wins, and reopening the picker then lands on the floor.
   */
  const onAgeChanged = (text: string, onChange: (value: string) => void) => {
    const digits = digitsOnly(text, AGE_MAX_DIGITS);
    onChange(digits);

    if (!digits) {
      setValue('dateOfBirth', '');
      clearErrors('age');
      return;
    }

    setValue(
      'dateOfBirth',
      dayjs().subtract(Number(digits), 'year').format(DOB_STORAGE_FORMAT),
    );
    clearErrors(['age', 'dateOfBirth']);
  };

  /**
   * A cancelled camera or gallery resolves to null, which is NOT an error: the
   * dialog closes and any existing photo stays. Only the file lands on disk
   * here — patient_photo and tbl_image_records are written at Save.
   */
  const onPhotoSourceSelected = async (source: PhotoSource) => {
    // Unreachable: the mount effect above mints the uuid before any tap.
    if (patientUuid === null) return;

    const path = await capturePhoto(source, patientUuid);
    setPhotoDialogVisible(false);

    if (path !== null) setValue('photoPath', path);
  };

  return (
    <>
      <RegistrationStepLayout
        currentStep="personal"
        title={t('patient.personal.title')}
        subtitle={t('patient.personal.subtitle')}
        scrollRef={scrollRef}
        footer={
          <PatientRegistrationButton
            label={t('patient.personal.submit')}
            onPress={handleSubmit(onValidSubmit, onInvalidSubmit)}
          />
        }
      >
        <Controller
          control={control}
          name="photoPath"
          render={({ field: { value } }) => (
            <ProfilePhotoField
              photoPath={value}
              onPress={() => setPhotoDialogVisible(true)}
              containerStyle={styles.photo}
            />
          )}
        />

        <View onLayout={rememberOffset('firstName')}>
          <Controller
            control={control}
            name="firstName"
            render={({ field: { value, onChange } }) => (
              <RegistrationTextField
                ref={firstNameRef}
                label={t('patient.personal.firstName')}
                required
                placeholder={t('patient.personal.firstNamePlaceholder')}
                returnKeyType="next"
                onSubmitEditing={() => middleNameRef.current?.focus()}
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  if (errors.firstName) clearErrors('firstName');
                }}
                error={errors.firstName?.message}
              />
            )}
          />
        </View>

        <Controller
          control={control}
          name="middleName"
          render={({ field: { value, onChange } }) => (
            <RegistrationTextField
              ref={middleNameRef}
              label={t('patient.personal.middleName')}
              placeholder={t('patient.personal.middleNamePlaceholder')}
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
              value={value}
              onChangeText={onChange}
              error={undefined}
            />
          )}
        />

        <View onLayout={rememberOffset('lastName')}>
          <Controller
            control={control}
            name="lastName"
            render={({ field: { value, onChange } }) => (
              <RegistrationTextField
                ref={lastNameRef}
                label={t('patient.personal.lastName')}
                required
                placeholder={t('patient.personal.lastNamePlaceholder')}
                returnKeyType="done"
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  if (errors.lastName) clearErrors('lastName');
                }}
                error={errors.lastName?.message}
              />
            )}
          />
        </View>

        {/* Not a form field — a constant the user cannot touch. The column
            stores 'F'; the shown word and the stored code differ on purpose. */}
        <RegistrationTextField
          label={t('patient.personal.gender')}
          value={t('patient.personal.genderValue')}
          disabled
          onChangeText={() => {}}
          error={undefined}
        />

        {/* No accessibilityLabel on the wrapper: the field inside already
            carries one, and two nodes of the same name break getByLabelText. */}
        <TouchableOpacity
          onPress={() => setDatePickerVisible(true)}
          onLayout={rememberOffset('dateOfBirth')}
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <RegistrationTextField
            label={t('patient.personal.dateOfBirth')}
            required
            placeholder={t('patient.personal.dateOfBirthPlaceholder')}
            editable={false}
            pointerEvents="none"
            leftSlot={
              <AppIcon name="calendar" size={fieldIcon} color={colors.registrationIcon} />
            }
            // Stored yyyy-MM-dd, shown DD-MM-YY. The YY never round-trips.
            value={dateOfBirth ? dayjs(dateOfBirth).format(DOB_DISPLAY_FORMAT) : ''}
            onChangeText={() => {}}
            error={errors.dateOfBirth?.message}
          />
        </TouchableOpacity>

        <View onLayout={rememberOffset('age')}>
          <Controller
            control={control}
            name="age"
            render={({ field: { value, onChange } }) => (
              <RegistrationTextField
                ref={ageRef}
                label={t('patient.personal.age')}
                required
                placeholder={t('patient.personal.agePlaceholder')}
                keyboardType="number-pad"
                maxLength={AGE_MAX_DIGITS}
                rightSlot={
                  <Text style={[styles.suffix, { fontSize: fs('input') }]}>
                    {t('patient.personal.ageSuffix')}
                  </Text>
                }
                value={value}
                onChangeText={(text) => onAgeChanged(text, onChange)}
                error={errors.age?.message}
              />
            )}
          />
        </View>

        {/* alignItems flex-start is load-bearing: without it a two-line error
            under one column drags the other column's box taller with it.
            One onLayout for both — they share a row, so they share a y. */}
        <View
          style={styles.row}
          onLayout={rememberOffset('mobileNumber', 'alternateMobileNumber')}
        >
          <View style={styles.column}>
            <Controller
              control={control}
              name="mobileNumber"
              render={({ field: { value, onChange } }) => (
                <RegistrationTextField
                  ref={mobileRef}
                  label={t('patient.personal.mobileNumber')}
                  placeholder={t('patient.personal.mobileNumberPlaceholder')}
                  keyboardType="number-pad"
                  maxLength={MOBILE_MAX_DIGITS}
                  value={value}
                  onChangeText={(text) => {
                    onChange(digitsOnly(text, MOBILE_MAX_DIGITS));
                    if (errors.mobileNumber) clearErrors('mobileNumber');
                  }}
                  error={errors.mobileNumber?.message}
                />
              )}
            />
          </View>
          <View style={styles.column}>
            <Controller
              control={control}
              name="alternateMobileNumber"
              render={({ field: { value, onChange } }) => (
                <RegistrationTextField
                  ref={alternateMobileRef}
                  label={t('patient.personal.alternateMobileNumber')}
                  placeholder={t('patient.personal.mobileNumberPlaceholder')}
                  keyboardType="number-pad"
                  maxLength={MOBILE_MAX_DIGITS}
                  value={value}
                  onChangeText={(text) => {
                    onChange(digitsOnly(text, MOBILE_MAX_DIGITS));
                    if (errors.alternateMobileNumber) clearErrors('alternateMobileNumber');
                  }}
                  error={errors.alternateMobileNumber?.message}
                />
              )}
            />
          </View>
        </View>
      </RegistrationStepLayout>

      <PhotoSourceDialog
        visible={photoDialogVisible}
        title={t('patient.personal.photoSource.title')}
        cameraLabel={t('patient.personal.photoSource.camera')}
        galleryLabel={t('patient.personal.photoSource.gallery')}
        cancelLabel={t('common.cancel')}
        onSelect={(source) => void onPhotoSourceSelected(source)}
        onClose={() => setPhotoDialogVisible(false)}
      />

      <AppDatePicker
        visible={datePickerVisible}
        value={dateOfBirth ? dayjs(dateOfBirth).toDate() : null}
        onChange={onDateConfirmed}
        onClose={() => setDatePickerVisible(false)}
        minDate={DOB_FLOOR}
        maxDate={dobCeiling}
        displayFormat={DOB_DISPLAY_FORMAT}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.confirm')}
      />
    </>
  );
};

const styles = StyleSheet.create({
  photo: {
    marginTop: spacing.md,
  },

  suffix: {
    color: colors.registrationSuffix,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },

  column: {
    flex: 1,
  },
});
