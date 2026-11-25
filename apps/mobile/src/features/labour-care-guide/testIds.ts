/**
 * Every QA locator (`testID`) in the labour screens, in one place (UI_CONVENTIONS section 13). A dialog's id also
 * names its parts: `<id>-close`, `<id>-cancel`, `<id>-confirm`.
 */
export const LABOUR_TEST_IDS = {
  timeline: {
    card: (checkpointId: string) => `timeline-card-${checkpointId}`,
    /** Record Now or Show on a card. */
    cardOpen: (checkpointId: string) => `timeline-card-${checkpointId}-open`,
    editIcon: 'timeline-edit-icon',
    sos: 'timeline-sos',
    chat: 'timeline-chat',
    videoCall: 'timeline-video-call',
    rx: 'timeline-rx',
    endStage: 'timeline-end-stage',
    sosDialog: 'timeline-sos-dialog',
    moveToStage2Dialog: 'timeline-move-to-stage2-dialog',
    outcomeConfirmDialog: 'timeline-outcome-confirm-dialog',
    deliveryLaterDialog: 'timeline-delivery-later-dialog',
  },
  capture: {
    back: 'capture-back',
    chat: 'capture-chat',
    videoCall: 'capture-video-call',
    rx: 'capture-rx',
    /** Next, and Save or Update on the last tab. */
    next: 'capture-next',
    leaveDialog: 'capture-leave-dialog',
    saveFailedDialog: 'capture-save-failed-dialog',
  },
  endStage: {
    stage1Dialog: 'end-stage1-dialog',
    stage1Option: (outcomeId: string) => `end-stage1-option-${outcomeId}`,
    stage2Dialog: 'end-stage2-dialog',
    stage2Option: (outcomeId: string) => `end-stage2-option-${outcomeId}`,
    stage2OtherComment: 'end-stage2-other-comment',
    referDialog: 'end-stage-refer-dialog',
    referHospital: 'end-stage-refer-hospital',
    referDoctor: 'end-stage-refer-doctor',
    referNote: 'end-stage-refer-note',
    motherDeathDialog: 'end-stage-mother-death-dialog',
    motherDeathReason: 'end-stage-mother-death-reason',
  },
} as const;
