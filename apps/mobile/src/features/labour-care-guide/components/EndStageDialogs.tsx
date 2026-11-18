import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import {
  OUTCOME_TEXT_MAX_LENGTH,
  STAGE1_OUTCOMES,
  STAGE2_OUTCOME,
  STAGE2_OUTCOMES,
  filterFreeText,
} from '@ezazi/clinical-rules';
import type { OutcomeDetails, Stage1OutcomeId, Stage2OutcomeId } from '@ezazi/clinical-rules';

import { colors, spacing } from '@/core/config/theme';
import { AppButton } from '@/core/ui/AppButton';
import { ChoiceButton } from '@/core/ui/ChoiceButton';
import { ControlTextInput } from '@/core/ui/ControlTextInput';
import { FormField } from '@/core/ui/FormField';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { Text } from '@/core/ui/Text';

/** The shared frame of the End Stage dialogs: title, body, an inline message, then No/Cancel and Yes. */
const DialogShell: React.FC<{
  visible: boolean;
  title: string;
  message?: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
}> = ({ visible, title, message, cancelLabel, confirmLabel, onCancel, onConfirm, children }) => {
  const { isTablet, scale } = useResponsive();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { maxWidth: isTablet ? scale(360) : 400 }]}>
          <Text style={[styles.title, { fontSize: isTablet ? scale(18) : 18 }]}>{title}</Text>
          <View style={styles.body}>{children}</View>
          {message ? (
            <Text style={styles.message} accessibilityLiveRegion="polite">
              {message}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <View style={styles.flex1}>
              <AppButton label={cancelLabel} onPress={onCancel} variant="secondary" size="compact" />
            </View>
            <View style={styles.flex1}>
              <AppButton label={confirmLabel} onPress={onConfirm} size="compact" />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const stage1Schema = (nothing: string) =>
  z.object({ choice: z.string().nullable() }).refine((form) => form.choice !== null, { message: nothing, path: ['choice'] });

/**
 * End Stage 1 (Android `CompleteVisitOnEndStage1Dialog`): "Select an option", the six choices in Android's
 * order, Yes / Cancel. A second tap clears a choice, as Android. Yes with nothing chosen keeps the dialog
 * open with Android's "Please select item" (Android closes it; Kaveri, 2026-11-06).
 */
export const EndStage1ChoiceDialog: React.FC<{
  visible: boolean;
  onCancel: () => void;
  onChoose: (outcome: Stage1OutcomeId) => void;
}> = ({ visible, onCancel, onChoose }) => {
  const { t } = useTranslation();
  const form = useForm<{ choice: string | null }>({
    defaultValues: { choice: null },
    resolver: zodResolver(stage1Schema(t('timeline.endStageFlow.stage1NothingSelected'))),
  });
  const close = () => {
    form.reset();
    onCancel();
  };
  const choose = form.handleSubmit(({ choice }) => {
    form.reset();
    onChoose(choice as Stage1OutcomeId);
  });
  return (
    <DialogShell
      visible={visible}
      title={t('timeline.endStageFlow.stage1Title')}
      message={form.formState.errors.choice?.message}
      cancelLabel={t('timeline.endStageFlow.cancel')}
      confirmLabel={t('timeline.endStageFlow.yes')}
      onCancel={close}
      onConfirm={() => void choose()}
    >
      <Controller
        control={form.control}
        name="choice"
        render={({ field }) => (
          <View style={styles.options}>
            {STAGE1_OUTCOMES.map((outcome) => (
              <ChoiceButton
                key={outcome.id}
                label={t(outcome.labelKey, { defaultValue: outcome.androidLabel })}
                state={{ selected: field.value === outcome.id }}
                onPress={() => {
                  field.onChange(field.value === outcome.id ? null : outcome.id);
                  form.clearErrors('choice');
                }}
              />
            ))}
          </View>
        )}
      />
    </DialogShell>
  );
};

interface Stage2Form {
  stage3: boolean;
  motherDeath: boolean;
  refer: string | null;
  otherComment: string;
}

const stage2Schema = (nothing: string) =>
  z
    .object({ stage3: z.boolean(), motherDeath: z.boolean(), refer: z.string().nullable(), otherComment: z.string() })
    .refine((f) => f.stage3 || f.motherDeath || f.refer !== null || f.otherComment.trim() !== '', {
      message: nothing,
      path: ['refer'],
    });

const EMPTY_STAGE2: Stage2Form = { stage3: false, motherDeath: false, refer: null, otherComment: '' };

/** End Stage 2's one choice, by Android's order of precedence (`manageBirthOutcomeSelection`). */
export function stage2Choice(form: Stage2Form): Stage2OutcomeId | null {
  if (form.stage3) return STAGE2_OUTCOME.STAGE3_EARLY_POSTPARTUM;
  if (form.motherDeath) return STAGE2_OUTCOME.MOTHER_DEATH;
  if (form.otherComment.trim() !== '') return STAGE2_OUTCOME.OTHER;
  return (form.refer as Stage2OutcomeId | null) ?? null;
}

/**
 * End Stage 2 (Android `CompleteVisitOnEnd2StageDialog`, "Additional Information"): the Stage-3 and Mother
 * Death checkboxes, the four referral rows and the "Enter Other Comment" box. Picking one clears the others,
 * as Android, except that the two checkboxes also clear each other (Android drops Mother Death when both are
 * ticked; Kaveri, 2026-11-06). Yes with nothing chosen keeps the dialog open with "Please select an option".
 */
export const EndStage2Dialog: React.FC<{
  visible: boolean;
  onCancel: () => void;
  onChoose: (outcome: Stage2OutcomeId, otherComment: string) => void;
}> = ({ visible, onCancel, onChoose }) => {
  const { t } = useTranslation();
  const form = useForm<Stage2Form>({
    defaultValues: EMPTY_STAGE2,
    resolver: zodResolver(stage2Schema(t('timeline.endStageFlow.stage2NothingSelected'))),
  });
  const values = form.watch();
  const set = (next: Partial<Stage2Form>) => {
    form.reset({ ...EMPTY_STAGE2, ...next });
  };
  const close = () => {
    form.reset(EMPTY_STAGE2);
    onCancel();
  };
  const choose = form.handleSubmit((submitted) => {
    const outcome = stage2Choice(submitted);
    form.reset(EMPTY_STAGE2);
    if (outcome) onChoose(outcome, submitted.otherComment);
  });

  return (
    <DialogShell
      visible={visible}
      title={t('timeline.endStageFlow.stage2Title')}
      message={form.formState.errors.refer?.message}
      cancelLabel={t('timeline.endStageFlow.cancel')}
      confirmLabel={t('timeline.endStageFlow.yes')}
      onCancel={close}
      onConfirm={() => void choose()}
    >
      <View style={styles.options}>
        {STAGE2_OUTCOMES.map((outcome) => {
          const label = t(outcome.labelKey, { defaultValue: outcome.androidLabel });
          if (outcome.kind === 'text') {
            return (
              <Controller
                key={outcome.id}
                control={form.control}
                name="otherComment"
                render={({ field }) => (
                  <ControlTextInput
                    label={label}
                    value={field.value}
                    placeholder={t('timeline.endStageFlow.otherCommentPlaceholder')}
                    multiline
                    numberOfLines={5}
                    maxLength={OUTCOME_TEXT_MAX_LENGTH}
                    onFocus={() => {
                      if (values.stage3 || values.motherDeath || values.refer) set({ otherComment: field.value });
                    }}
                    onChangeText={(text) => {
                      field.onChange(filterFreeText(text));
                      form.clearErrors('refer');
                    }}
                  />
                )}
              />
            );
          }
          const selected =
            outcome.id === STAGE2_OUTCOME.STAGE3_EARLY_POSTPARTUM
              ? values.stage3
              : outcome.id === STAGE2_OUTCOME.MOTHER_DEATH
                ? values.motherDeath
                : values.refer === outcome.id;
          const press = () => {
            if (outcome.id === STAGE2_OUTCOME.STAGE3_EARLY_POSTPARTUM) set({ stage3: !values.stage3 });
            else if (outcome.id === STAGE2_OUTCOME.MOTHER_DEATH) set({ motherDeath: !values.motherDeath });
            else set({ refer: outcome.id });
          };
          return <ChoiceButton key={outcome.id} label={label} state={{ selected }} onPress={press} />;
        })}
      </View>
    </DialogShell>
  );
};

interface ReferForm {
  hospitalName: string;
  doctorName: string;
  note: string;
}

const referSchema = z.object({ hospitalName: z.string(), doctorName: z.string(), note: z.string() });

/** "Refer Section" (Android `ReferTypeHelper.referOtherHospitalDialog`): three optional fields, No / Yes. */
export const ReferHospitalDialog: React.FC<{
  visible: boolean;
  onCancel: () => void;
  onDone: (details: OutcomeDetails) => void;
}> = ({ visible, onCancel, onDone }) => {
  const { t } = useTranslation();
  const form = useForm<ReferForm>({
    defaultValues: { hospitalName: '', doctorName: '', note: '' },
    resolver: zodResolver(referSchema),
  });
  const close = () => {
    form.reset();
    onCancel();
  };
  const done = form.handleSubmit((details) => {
    form.reset();
    onDone(details);
  });
  const field = (name: keyof ReferForm, labelKey: string, placeholderKey: string) => (
    <FormField label={t(labelKey)}>
      <Controller
        control={form.control}
        name={name}
        render={({ field: input }) => (
          <ControlTextInput
            label={t(labelKey)}
            value={input.value}
            placeholder={t(placeholderKey)}
            onChangeText={(text) => input.onChange(filterFreeText(text))}
          />
        )}
      />
    </FormField>
  );
  return (
    <DialogShell
      visible={visible}
      title={t('timeline.endStageFlow.refer.title')}
      cancelLabel={t('timeline.endStageFlow.no')}
      confirmLabel={t('timeline.endStageFlow.yes')}
      onCancel={close}
      onConfirm={() => void done()}
    >
      {field('hospitalName', 'timeline.endStageFlow.refer.hospitalName', 'timeline.endStageFlow.refer.hospitalNamePlaceholder')}
      {field('doctorName', 'timeline.endStageFlow.refer.doctorName', 'timeline.endStageFlow.refer.doctorNamePlaceholder')}
      {field('note', 'timeline.endStageFlow.refer.note', 'timeline.endStageFlow.refer.notePlaceholder')}
    </DialogShell>
  );
};

const motherDeathSchema = (required: string) =>
  z.object({ reason: z.string().min(1, required).max(OUTCOME_TEXT_MAX_LENGTH) });

/** "Mother Death" (Android `VisitCompletionHelper.showMotherDeceasedDialog`): a reason is required, up to 300. */
export const MotherDeathDialog: React.FC<{
  visible: boolean;
  onCancel: () => void;
  onDone: (reason: string) => void;
}> = ({ visible, onCancel, onDone }) => {
  const { t } = useTranslation();
  const form = useForm<{ reason: string }>({
    defaultValues: { reason: '' },
    resolver: zodResolver(motherDeathSchema(t('timeline.endStageFlow.motherDeath.required'))),
  });
  const close = () => {
    form.reset();
    onCancel();
  };
  const done = form.handleSubmit(({ reason }) => {
    form.reset();
    onDone(reason);
  });
  const error = form.formState.errors.reason?.message;
  return (
    <DialogShell
      visible={visible}
      title={t('timeline.endStageFlow.motherDeath.title')}
      message={error}
      cancelLabel={t('timeline.endStageFlow.no')}
      confirmLabel={t('timeline.endStageFlow.yes')}
      onCancel={close}
      onConfirm={() => void done()}
    >
      <Controller
        control={form.control}
        name="reason"
        render={({ field }) => (
          <View style={styles.reason}>
            <ControlTextInput
              label={t('timeline.endStageFlow.motherDeath.title')}
              value={field.value}
              placeholder={t('timeline.endStageFlow.motherDeath.placeholder')}
              multiline
              numberOfLines={5}
              maxLength={OUTCOME_TEXT_MAX_LENGTH}
              error={!!error}
              onChangeText={(text) => field.onChange(filterFreeText(text))}
            />
            <Text style={styles.counter}>{`${field.value.length}/${OUTCOME_TEXT_MAX_LENGTH}`}</Text>
          </View>
        )}
      />
    </DialogShell>
  );
};


const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.dialogOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.primaryTextFigma,
    fontWeight: '700',
  },
  body: {
    gap: spacing.sm,
  },
  options: {
    gap: spacing.sm,
  },
  message: {
    color: colors.error,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex1: {
    flex: 1,
  },
  reason: {
    gap: spacing.xs,
  },
  counter: {
    alignSelf: 'flex-end',
    color: colors.textSecondary,
  },
});
