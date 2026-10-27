import React from 'react';
import { useTranslation } from 'react-i18next';
import type { YesNoAnswer } from '@ezazi/clinical-rules';

import { SegmentedChoice } from '@/core/ui/SegmentedChoice';

interface YesNoChoiceProps {
  value: YesNoAnswer;
  onChange: (answer: 'yes' | 'no') => void;
}

/** The Yes / No that opens Oxytocin, Medicine and IV Fluids (Figma "OXYTOCIN ADMINISTERED?"). */
export const YesNoChoice: React.FC<YesNoChoiceProps> = ({ value, onChange }) => {
  const { t } = useTranslation();
  return (
    <SegmentedChoice
      options={[
        { value: 'yes', label: t('capture.answer.yes') },
        { value: 'no', label: t('capture.answer.no') },
      ]}
      value={value}
      onChange={(answer) => onChange(answer === 'yes' ? 'yes' : 'no')}
    />
  );
};
