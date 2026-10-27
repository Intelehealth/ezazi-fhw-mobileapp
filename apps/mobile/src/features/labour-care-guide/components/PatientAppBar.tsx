import React from 'react';

import { logger } from '@/core/utils/logger';

import { usePatientHeaderViewModel } from '../stores/usePatientHeaderViewModel';
import { PatientHeader, type HeaderNavigation } from './PatientHeader';

interface PatientAppBarProps {
  visitUuid: string;
  navigation: HeaderNavigation;
  onNavigate: () => void;
}

/**
 * The labour screens' app bar, mounted by the navigator (MOBILE_STACK §3.1 presets
 * `patientAppBar` / `patientCaptureAppBar`), never by a screen.
 */
export const PatientAppBar: React.FC<PatientAppBarProps> = ({ visitUuid, navigation, onNavigate }) => {
  const patient = usePatientHeaderViewModel(visitUuid);

  return (
    <PatientHeader
      patient={patient}
      navigation={navigation}
      onNavigate={onNavigate}
      // LCG and Postpartum Report screens are not built yet.
      onViewLcg={() => logger.debug('[patientAppBar] View LCG tapped')}
      onViewPostpartumReport={() => logger.debug('[patientAppBar] Postpartum Report tapped')}
    />
  );
};
