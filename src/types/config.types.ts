/**
 * Types for the remote feature-config API response.
 * Source of truth — keep src/__mocks__/configResponse.json in sync with FeatureFlags.
 */

export interface FeatureFlags {
  // Labour care workflow sections
  partographSection: boolean;
  fetalHeartRateSection: boolean;
  contractionMonitoring: boolean;
  riskAssessmentSection: boolean;
  referralSection: boolean;
  newbornCareSection: boolean;
  deliveryOutcomeSection: boolean;
  postpartumMonitoring: boolean; // replaces env.FEATURE_FLAG_POSTPARTUM_MONITORING
  stage3Features: boolean;       // replaces env.FEATURE_FLAG_STAGE3

  // Visit summary
  notesSection: boolean;
  attachmentSection: boolean;
  priorityVisitSection: boolean;
  hwFollowUpSection: boolean;

  // Mother registration section gates
  activeStatusMotherAddress: boolean;
  activeStatusMotherOther: boolean;

  // Communication
  chatSection: boolean;
  videoCallSection: boolean;

  // Home / reporting
  hmisReportingSection: boolean;
  draftSurveySection: boolean;
}

export interface FieldConfig {
  key: string;
  isEnabled: boolean;
  isMandatory: boolean;
  isEditable: boolean;
}

export interface MotherRegFieldsConfig {
  personal: FieldConfig[];
  address: FieldConfig[];
  other: FieldConfig[];
}

export interface ActiveSection {
  key: string;
  isEnabled: boolean;
  order: number;
  /** Localised labels keyed by language code, e.g. { en: 'Labour Care', hi: 'प्रसव देखभाल' } */
  lang: Record<string, string>;
}

export interface ConfigResponse {
  configVersion: number;
  featureFlags: FeatureFlags;
  motherRegFields: MotherRegFieldsConfig;
  homeScreen: ActiveSection[];
  supportedLanguages: string[];
}

/** All flags true — used as fallback when config has not yet loaded (fail-open). */
export const defaultFeatureFlags: FeatureFlags = {
  partographSection: true,
  fetalHeartRateSection: true,
  contractionMonitoring: true,
  riskAssessmentSection: true,
  referralSection: true,
  newbornCareSection: true,
  deliveryOutcomeSection: true,
  postpartumMonitoring: true,
  stage3Features: true,
  notesSection: true,
  attachmentSection: true,
  priorityVisitSection: true,
  hwFollowUpSection: true,
  activeStatusMotherAddress: true,
  activeStatusMotherOther: true,
  chatSection: true,
  videoCallSection: true,
  hmisReportingSection: true,
  draftSurveySection: true,
};

export const defaultConfigResponse: ConfigResponse = {
  configVersion: 0,
  featureFlags: defaultFeatureFlags,
  motherRegFields: { personal: [], address: [], other: [] },
  homeScreen: [],
  supportedLanguages: ['en'],
};
