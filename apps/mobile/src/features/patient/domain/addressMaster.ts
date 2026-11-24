import rawAsset from './state_district_tehsil.json';

/**
 * The state / district master data, and the `District:Village` codec.
 *
 * One module owns both, because they are two halves of the same thing: the
 * cascade decides whether a district was collected at all, and the codec
 * decides how that answer is folded into the single `city_village` column.
 * The legacy had them apart — `AppRegion.districtsFor()` did the lookup and
 * `PatientAddressInfoFragment` encoded inline, in TWO handlers that had to be
 * kept in step by hand.
 *
 * The data is a bundled JSON asset. Not the database, not the API: states and
 * districts are reference data that ships with the build.
 */

// ── The asset ───────────────────────────────────────────────────────────────

/**
 * The shape, declared rather than inferred.
 *
 * `resolveJsonModule` is on, so the import works untyped — but letting
 * TypeScript hand back the inferred shape of a 150 KB literal documents
 * nothing. Three nested interfaces say what this module actually relies on.
 *
 * `tahasil` is deliberately NOT declared. It is 93% of the file's bytes and
 * nothing reads it; the file ships whole because it is shared with other
 * projects, and leaving the key out of the type is the record that it is
 * unread on purpose rather than forgotten.
 *
 * There are no `state-hi` / `name-hi` keys in the data either — the legacy's
 * `StateData` and `DistData` declared them and `setStateAdapter()` read them
 * whenever the app language was not English, which would have filled the
 * dropdown with nulls. English names are the only labels there are.
 */
interface DistrictEntry {
  name: string;
}

interface StateEntry {
  state: string;
  districts: DistrictEntry[];
}

interface AddressMasterAsset {
  states: StateEntry[];
}

// A plain assignment, not `as`: the inferred literal type is assignable to
// this, so the compiler still checks that the asset really has this shape. An
// `as` cast would assert it and check nothing — and this is the one place that
// would notice if the shared file were ever restructured.
const asset: AddressMasterAsset = rawAsset;

// ── Lookups, built once at module load ──────────────────────────────────────

/**
 * Code-unit order, not `localeCompare`.
 *
 * Every name in the asset is ASCII and Title Case, so the two agree on all 750
 * of them — but `localeCompare` depends on the ICU data the runtime happens to
 * ship, and a list that sorts differently in jest than on a device is not a
 * list anyone can test. This comparator is the same everywhere.
 */
const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Match key for a name the user or a restored draft supplies: trimmed and
 * lowercased. The legacy's `districtsFor()` compared with `equalsIgnoreCase`,
 * so case-insensitive matching is carried, not invented. What is RETURNED is
 * always the asset's own spelling, so whatever matched, what gets stored is
 * canonical.
 */
const matchKey = (name: string): string => name.trim().toLowerCase();

/** Shared, so an unknown state returns a stable reference every time. */
const NO_DISTRICTS: readonly string[] = Object.freeze([]);

/**
 * Sorted alphabetically — a display-order change only, nothing stored moves.
 * The file is nearly sorted and not quite: `Uttarakhand` sits before `Uttar
 * Pradesh`, and Uttar Pradesh's own districts open with `Prayagraj` ahead of
 * `Ambedkar Nagar`. A list that is alphabetical except in two places is worse
 * to scan than either.
 */
const STATE_NAMES: readonly string[] = Object.freeze(
  asset.states.map((entry) => entry.state).sort(compare),
);

/**
 * Lowercased state name → that state's district names, sorted.
 *
 * Built at module load, not per render: 35 states and 715 districts is not
 * work to redo on every keystroke of a form. Module-private and never handed
 * out, so nothing outside can add to it; the arrays inside are frozen, which
 * is what the exported `readonly` types rest on.
 */
const DISTRICTS_BY_STATE = new Map<string, readonly string[]>();

for (const entry of asset.states) {
  DISTRICTS_BY_STATE.set(
    matchKey(entry.state),
    Object.freeze(entry.districts.map((district) => district.name).sort(compare)),
  );
}

// ── The public surface ──────────────────────────────────────────────────────

/**
 * Every state, for the Province/State dropdown. No `Select` placeholder row —
 * the trigger's own placeholder says that, and the legacy's placeholder row is
 * exactly what let the literal string `Select` be written into
 * `state_province`.
 *
 * `readonly` on purpose. This is the module's own array, returned rather than
 * copied so the list is built once; the type is what stops a caller sorting or
 * splicing it in place.
 */
export function listStates(): readonly string[] {
  return STATE_NAMES;
}

/**
 * The districts of one state, sorted. An unknown, empty or whitespace-only
 * name gives an empty list — which is also what drives the District field's
 * absence, so "no state picked yet" and "a state that lists no districts" are
 * one case and not two.
 */
export function districtsOf(stateName: string): readonly string[] {
  return DISTRICTS_BY_STATE.get(matchKey(stateName)) ?? NO_DISTRICTS;
}

/**
 * Is this a real state in the asset?
 *
 * This closes a legacy hole rather than adding a rule: `areValidFields()`
 * computed `searchForState(stateText)` and then never read the result, so the
 * placeholder row's literal `Select` passed the submit gate and was written to
 * the database. In practice the dropdown can only hand back a real entry, so
 * on the create path this fires on a restored draft naming a state the asset
 * no longer has.
 */
export function isKnownState(stateName: string): boolean {
  return DISTRICTS_BY_STATE.has(matchKey(stateName));
}

/**
 * Is this district one of THAT state's? A real district of the wrong state is
 * rejected, which a flat "is it a district anywhere" check would let through.
 */
export function isKnownDistrict(stateName: string, districtName: string): boolean {
  const wanted = matchKey(districtName);

  if (!wanted) return false;

  return districtsOf(stateName).some((name) => matchKey(name) === wanted);
}

/**
 * Does this state list districts at all? The one call that gates the District
 * field's render, the district rule in the schema, and the `District:` prefix
 * in the encoding — so all three agree by construction.
 */
export function stateHasDistricts(stateName: string): boolean {
  return districtsOf(stateName).length > 0;
}

// ── The `District:Village` codec ────────────────────────────────────────────

/**
 * There is no district column. `city_village` carries both, joined by a colon:
 * `"Pune:Sinnar"` when the state has districts and one was chosen, a bare
 * `"Sinnar"` otherwise.
 *
 * KEEP THE ENCODING. Changing it is a server contract decision, not a UI one —
 * older rows and server-written rows are already out there in both shapes.
 *
 * The `stateHasDistricts && d` guard is what stops a leading `":Sinnar"` ever
 * being written. That is the legacy's own fix, carried.
 *
 * Called from the save mapper, not from the screen: the form holds state,
 * district and village as three separate values and the draft store parks them
 * that way, so "which column does this field become" stays in one file.
 */
export function encodeCityVillage(
  stateName: string,
  district: string,
  village: string,
): string {
  const v = village.trim();
  const d = district.trim();

  return stateHasDistricts(stateName) && d ? `${d}:${v}` : v;
}

/**
 * The other half. Splits at the FIRST colon, not on an exact count of two
 * parts: the legacy required exactly two and otherwise treated the whole
 * string as the village, so a server row reading `"Pune:Navi:Mumbai"` showed
 * up whole in the village box with the district silently dropped. Our own
 * writes can never carry two colons — the village rule rejects the character —
 * but a row we did not write can.
 *
 * Written and tested now although nothing calls it yet. Edit mode is the first
 * caller and is not built; writing the two halves together is what keeps them
 * symmetric.
 */
export function decodeCityVillage(stored: string): { district: string; village: string } {
  const value = stored.trim();
  const separator = value.indexOf(':');

  return separator < 0
    ? { district: '', village: value }
    : {
        district: value.slice(0, separator).trim(),
        village: value.slice(separator + 1).trim(),
      };
}
