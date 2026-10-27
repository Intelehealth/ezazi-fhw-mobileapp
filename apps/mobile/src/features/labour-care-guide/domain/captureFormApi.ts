import type {
  FieldId,
  InfusionAnswer,
  InfusionInputId,
  MedicineAnswer,
  MedicineEntry,
  StepperSpec,
} from '@ezazi/clinical-rules';

export type InfusionFieldId = 'oxytocin' | 'ivFluids';
export type NoteFieldId = 'assessment' | 'plan';

/** Stepper bounds of the Oxytocin strength and the infusion rate. */
export interface InfusionBounds {
  strength: StepperSpec;
  rate: StepperSpec;
}

/** One alerted value, ready to show: the field's label and the value as the nurse picked it. */
export interface SummaryItem {
  labelKey: string;
  androidLabel: string;
  value: string;
}

/** The alerted values of one tab, for the Shared decision summary. */
export interface SummarySection {
  labelKey: string;
  androidLabel: string;
  items: SummaryItem[];
}

/** What the capture tabs read and call; the capture ViewModel provides it. */
export interface CaptureFormApi {
  fieldValue: (id: FieldId) => string;
  fieldAlert: (id: FieldId) => boolean;
  fieldError: (id: FieldId | InfusionInputId) => string | undefined;
  setValue: (id: FieldId, value: string) => void;

  infusionAnswer: (id: InfusionFieldId) => InfusionAnswer;
  infusionErrors: (id: InfusionFieldId) => Partial<Record<string, string>>;
  setInfusionAnswer: (id: InfusionFieldId, answer: 'yes' | 'no') => void;
  setInfusionInput: (id: InfusionFieldId, input: InfusionInputId, value: string) => void;
  infusionBounds: InfusionBounds;

  medicine: MedicineAnswer;
  setMedicineAnswer: (answer: 'yes' | 'no') => void;
  addMedicine: (medicine: MedicineEntry) => void;
  updateMedicine: (index: number, medicine: MedicineEntry) => void;
  removeMedicine: (index: number) => void;

  fieldNotes: (id: NoteFieldId) => readonly string[];
  addNote: (id: NoteFieldId, text: string) => void;
  removeNote: (id: NoteFieldId, index: number) => void;

  summary: readonly SummarySection[];
}
