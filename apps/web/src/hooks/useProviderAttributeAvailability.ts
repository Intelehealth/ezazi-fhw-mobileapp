import { useState } from 'react';
import { showToast } from '../services/toast';
import { useValidateProviderAttribute } from './mutations/useValidateProviderAttribute';

export type CheckedAttribute = 'emailId' | 'phoneNumber';

/**
 * Ports ProviderAttributeValidator/AuthService.validateProviderAttribute —
 * the email/phone "already exists" check both profile screens run on blur
 * (checked once on blur rather than Angular's debounced valueChanges stream,
 * since these fields only need a one-shot check). The "taken" flags live
 * here, outside react-hook-form's schema errors, because the zod resolver
 * re-validates on every change and would immediately clear a `setError()`
 * for this async, schema-external check.
 *
 * Two guards the Angular source doesn't need: a failed request shows a toast
 * instead of surfacing as an unhandled rejection (the field is then left
 * unflagged), and a result is dropped when the field no longer holds the
 * value that was checked — otherwise a slow check for an old value could
 * flag, and disable Save for, a newer one.
 *
 * @param getCurrentValue reads the field's present value (e.g. RHF's getValues).
 */
export function useProviderAttributeAvailability(
  providerUuid: string,
  getCurrentValue: (field: CheckedAttribute) => string
) {
  const validateAttribute = useValidateProviderAttribute();
  const [taken, setTaken] = useState<Record<CheckedAttribute, boolean>>({
    emailId: false,
    phoneNumber: false,
  });

  async function checkAvailability(field: CheckedAttribute, rawValue: string) {
    const value = rawValue.trim();
    if (!value) return;

    try {
      const isAvailable = await validateAttribute.mutateAsync({
        attributeType: field,
        attributeValue: value,
        providerUuid,
      });
      if (getCurrentValue(field).trim() !== value) return;
      setTaken(previous => ({ ...previous, [field]: !isAvailable }));
    } catch (error) {
      showToast('Availability Check Failed', (error as Error).message, 'error');
    }
  }

  function clearTaken(field: CheckedAttribute) {
    setTaken(previous => ({ ...previous, [field]: false }));
  }

  return {
    emailTaken: taken.emailId,
    phoneTaken: taken.phoneNumber,
    checkAvailability,
    clearTaken,
  };
}
