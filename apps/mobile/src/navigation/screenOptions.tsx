import type { NativeStackHeaderProps, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { BrandAppBar } from '@/core/ui/BrandAppBar';
import { PatientAppBar } from '@/features/labour-care-guide/components/PatientAppBar';
import type { HeaderNavigation } from '@/features/labour-care-guide/components/PatientHeader';
import type { VisitRouteParams } from './types';

/**
 * The header presets (MOBILE_STACK §3.1). A navigator group picks the default its screens
 * mostly need; an exception overrides it with one `options={…}` on the screen.
 */
export const brandAppBar: NativeStackNavigationOptions = {
  headerShown: true,
  header: () => <BrandAppBar />,
};

export const noHeader: NativeStackNavigationOptions = {
  headerShown: false,
};

// Only labour routes use these presets, and each carries its visit (VisitRouteParams).
const patientHeader = (navigation: HeaderNavigation): NativeStackNavigationOptions => ({
  headerShown: true,
  header: ({ navigation: stack, route }: NativeStackHeaderProps) => (
    <PatientAppBar
      visitUuid={(route.params as VisitRouteParams).visitUuid}
      navigation={navigation}
      onNavigate={() => stack.goBack()}
    />
  ),
});

/** Timeline: the patient, LCG / Postpartum shortcuts, close. */
export const patientAppBar = patientHeader('close');

/** Card capture: back first; the screen's own guard asks to save before leaving. */
export const patientCaptureAppBar = patientHeader('back');
