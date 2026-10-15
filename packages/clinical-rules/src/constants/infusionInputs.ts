/** Ids of the inputs inside the Oxytocin and IV Fluids fields. Not the stored JSON keys (`storage/`). */
export const INFUSION_INPUT_ID = {
  STRENGTH: 'oxytocinStrength',
  INFUSION_RATE: 'infusionRate',
  INFUSION_STATUS: 'infusionStatus',
  IV_FLUID_TYPE: 'ivFluidType',
  OTHER_TYPE: 'otherType',
} as const;

export type InfusionInputId = (typeof INFUSION_INPUT_ID)[keyof typeof INFUSION_INPUT_ID];
