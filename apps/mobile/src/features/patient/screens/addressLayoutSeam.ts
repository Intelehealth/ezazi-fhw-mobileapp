import { stateHasDistricts } from '../domain/addressMaster';

/**
 * The one seam between the address screen's layout and its form state.
 *
 * District is the only piece of this screen's markup that depends on a form
 * value: it is absent until a state with districts is picked, never greyed out
 * (PATIENT_ADDRESS_INFO_PLAN.md section 3). Village's width switch reads the
 * same answer — full row while District is absent, half once it appears.
 *
 * KEEP THIS MODULE. Its earlier header said to delete it and read
 * `stateHasDistricts` inside the component; that was wrong, and the port doc's
 * decision D overrules it. The screen's render tests `jest.mock` this file to
 * drive both layouts, because the alternative — picking a state through the
 * dropdown — needs `measureInWindow`, which the React Native test renderer
 * never calls. Delete the module and the whole test file fails.
 *
 * What changed when the form was wired is the LITERAL, not the module: the UI
 * chat's `export const HAS_DISTRICT = false` is now the function below, called
 * with `watch('state')`.
 *
 * It forwards rather than deciding anything of its own, deliberately. The rule
 * belongs in `addressMaster`, where the schema's district rule reads it too —
 * one call gates the render and the validation, so they cannot disagree.
 */
export function hasDistrict(stateName: string): boolean {
  return stateHasDistricts(stateName);
}
