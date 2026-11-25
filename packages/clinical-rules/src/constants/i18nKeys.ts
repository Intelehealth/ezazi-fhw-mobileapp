/** Translation key shapes. Build every key here; never write one by hand. */
const ROOT = 'partogram';

export function fieldLabelKey(fieldId: string): string {
  return `${ROOT}.field.${fieldId}`;
}

export function optionLabelKey(ownerId: string, slug: string): string {
  return `${ROOT}.option.${ownerId}.${slug}`;
}

export function sectionLabelKey(sectionId: string): string {
  return `${ROOT}.section.${sectionId}`;
}

export function infusionInputLabelKey(inputId: string): string {
  return `${ROOT}.infusion.${inputId}`;
}

export function validationMessageKey(id: string, reason: string): string {
  return `${ROOT}.validation.${id}.${reason}`;
}

export function outcomeLabelKey(outcomeId: string): string {
  return `${ROOT}.outcome.${outcomeId}`;
}
