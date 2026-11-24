import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { colors, dimens, spacing } from '@/core/config/theme';
import { AppDatePicker } from '@/core/ui/AppDatePicker';
import { AppIcon } from '@/core/ui/icons';
import { PhotoSourceDialog } from '@/core/ui/PhotoSourceDialog';
import { Text } from '@/core/ui/Text';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { PatientRegistrationButton } from '../components/PatientRegistrationButton';
import { ProfilePhotoField } from '../components/ProfilePhotoField';
import { RegistrationStepLayout } from '../components/RegistrationStepLayout';
import { RegistrationTextField } from '../components/RegistrationTextField';

/**
 * Step 1 of registration — LAYOUT ONLY. Every input is a literal placeholder:
 * value='', onChangeText=noop, error=undefined. The code chat wraps each in a
 * Controller and replaces those three; nothing else about the markup moves.
 * Static fields look wrong in the simulator and are correct.
 */

/** The picker's bounds. The age RULE itself is the code chat's (§5). */
const DOB_FLOOR = new Date(1970, 0, 1);
const MIN_AGE_YEARS = 13;
const DOB_DISPLAY_FORMAT = 'DD-MM-YY';

const AGE_MAX_DIGITS = 2;
const MOBILE_MAX_DIGITS = 10;

type Nav = NativeStackNavigationProp<RootStackParamList, 'AddPatientPersonal'>;

export const PatientPersonalInfoScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { fs, isTablet, scale } = useResponsive();

  const scrollRef = useRef<ScrollView>(null);
  const middleNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);

  const [photoDialogVisible, setPhotoDialogVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const dobCeiling = useMemo(
    () => dayjs().subtract(MIN_AGE_YEARS, 'year').toDate(),
    [],
  );
  const fieldIcon = isTablet
    ? scale(dimens.registrationFieldIcon.tablet)
    : dimens.registrationFieldIcon.phone;

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
            // TEMPORARY, item 4's code chat replaces this with a validated submit:
            // plain navigation so the address step is reachable on device.
            onPress={() => navigation.navigate('AddPatientAddress')}
          />
        }
      >
        <ProfilePhotoField
          onPress={() => setPhotoDialogVisible(true)}
          containerStyle={styles.photo}
        />

        <RegistrationTextField
          label={t('patient.personal.firstName')}
          required
          placeholder={t('patient.personal.firstNamePlaceholder')}
          returnKeyType="next"
          onSubmitEditing={() => middleNameRef.current?.focus()}
          value={''}
          onChangeText={() => {}}
          error={undefined}
        />

        <RegistrationTextField
          ref={middleNameRef}
          label={t('patient.personal.middleName')}
          placeholder={t('patient.personal.middleNamePlaceholder')}
          returnKeyType="next"
          onSubmitEditing={() => lastNameRef.current?.focus()}
          value={''}
          onChangeText={() => {}}
          error={undefined}
        />

        <RegistrationTextField
          ref={lastNameRef}
          label={t('patient.personal.lastName')}
          required
          placeholder={t('patient.personal.lastNamePlaceholder')}
          returnKeyType="done"
          value={''}
          onChangeText={() => {}}
          error={undefined}
        />

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
            value={''}
            onChangeText={() => {}}
            error={undefined}
          />
        </TouchableOpacity>

        <RegistrationTextField
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
          value={''}
          onChangeText={() => {}}
          error={undefined}
        />

        {/* alignItems flex-start is load-bearing: without it a two-line error
            under one column drags the other column's box taller with it. */}
        <View style={styles.row}>
          <View style={styles.column}>
            <RegistrationTextField
              label={t('patient.personal.mobileNumber')}
              placeholder={t('patient.personal.mobileNumberPlaceholder')}
              keyboardType="number-pad"
              maxLength={MOBILE_MAX_DIGITS}
              value={''}
              onChangeText={() => {}}
              error={undefined}
            />
          </View>
          <View style={styles.column}>
            <RegistrationTextField
              label={t('patient.personal.alternateMobileNumber')}
              placeholder={t('patient.personal.mobileNumberPlaceholder')}
              keyboardType="number-pad"
              maxLength={MOBILE_MAX_DIGITS}
              value={''}
              onChangeText={() => {}}
              error={undefined}
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
        onSelect={() => {}}
        onClose={() => setPhotoDialogVisible(false)}
      />

      <AppDatePicker
        visible={datePickerVisible}
        value={null}
        onChange={() => {}}
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
