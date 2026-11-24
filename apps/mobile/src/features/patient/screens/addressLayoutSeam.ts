/**
 * The one seam between the address screen's layout and its form state.
 *
 * District is the only piece of this screen's markup that depends on a form
 * value: it is absent until a state with districts is picked (never greyed
 * out - see PATIENT_ADDRESS_INFO_PLAN.md section 3). That would otherwise
 * break the rule that the code chat moves no markup, so the UI chat renders
 * it off this constant and the code chat replaces the read.
 *
 * UI chat: a literal. Flip it by hand to lay out both states.
 *
 * Code chat: delete this module and read
 * `stateHasDistricts(watch('state'))` inside the component instead. Nothing
 * else about the markup moves.
 *
 * It lives in its own file rather than at the top of the screen only so the
 * render tests can drive both layouts; a literal inside the screen cannot be
 * flipped from a test.
 */
export const HAS_DISTRICT = false;
