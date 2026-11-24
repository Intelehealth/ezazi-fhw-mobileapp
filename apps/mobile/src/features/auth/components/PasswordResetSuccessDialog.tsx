import React from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/core/ui/ConfirmDialog';

interface Props {
  visible: boolean;
  onBackToLogin: () => void;
  /** QA locator. */
  testID?: string;
}

/** "Password reset successful" (Figma "Successful" modal): the app dialog in its success tone, one button. */
export const PasswordResetSuccessDialog: React.FC<Props> = ({ visible, onBackToLogin, testID }) => {
  const { t } = useTranslation();
  return (
    <ConfirmDialog
      visible={visible}
      tone="success"
      title={t('forgotPassword.reset.success.title')}
      message={t('forgotPassword.reset.success.message')}
      confirmLabel={t('forgotPassword.reset.success.button')}
      onConfirm={onBackToLogin}
      onClose={onBackToLogin}
      testID={testID}
    />
  );
};
