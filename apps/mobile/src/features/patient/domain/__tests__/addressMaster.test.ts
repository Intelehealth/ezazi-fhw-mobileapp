import rawAsset from '../state_district_tehsil.json';
import {
  decodeCityVillage,
  districtsOf,
  encodeCityVillage,
  isKnownDistrict,
  isKnownState,
  listStates,
  stateHasDistricts,
} from '../addressMaster';

/**
 * The cascade is covered HERE, not in the screen tests.
 *
 * Picking a state in the UI means opening an anchored dropdown, and the panel
 * anchors with `measureInWindow`, which the React Native test renderer never
 * calls — `SetupScreen.test.tsx` carries a written note saying exactly that
 * about the location picker, and `AppDropdown` inherits the limit. So the
 * state → district relationship is pinned at this layer, where it is real
 * data and not a tap, and the screen tests drive the layout seam instead.
 *
 * Numbering restarts at 1 in every test file — there is no continuous run
 * across files.
 */

// Counts measured from the shipped asset, not guessed. They are asserted
// rather than derived so that a change to the shared file fails loudly here
// instead of quietly changing what the dropdown offers.
const TOTAL_STATES = 35;

describe('listStates', () => {

  // 1 -------------------------------------------------------------------------

  it('returns every state in the asset', () => {
    expect(listStates()).toHaveLength(TOTAL_STATES);
  });

  it('is sorted alphabetically', () => {
    const names = listStates();

    // The real assertion: file order would fail this. The asset is nearly
    // sorted and not quite, which is why sorting at all was a decision.
    for (let i = 1; i < names.length; i += 1) {
      expect(names[i - 1] <= names[i]).toBe(true);
    }
  });

  it('puts the two the asset had out of order the right way round', () => {
    const names = listStates();

    // `Uttarakhand` sits before `Uttar Pradesh` in the file. This is the pair
    // that proves the sort ran, so it is named rather than left to the loop.
    expect(names.indexOf('Uttar Pradesh')).toBeLessThan(names.indexOf('Uttarakhand'));
    expect(names[0]).toBe('Andhra Pradesh');
    expect(names[names.length - 1]).toBe('West Bengal');
  });

  it('carries no Select placeholder row', () => {
    // The legacy's placeholder row is exactly what let the literal string
    // `Select` reach `state_province`. There is no row to pick here.
    expect(listStates()).not.toContain('Select');
  });
});

describe('districtsOf', () => {

  // 2 -------------------------------------------------------------------------

  it('returns the measured count for a middling, the largest and the smallest state', () => {
    expect(districtsOf('Maharashtra')).toHaveLength(33);
    expect(districtsOf('Uttar Pradesh')).toHaveLength(75);
    expect(districtsOf('Chandigarh (UT)')).toHaveLength(1);
  });

  it('sorts them alphabetically', () => {
    const districts = districtsOf('Uttar Pradesh');

    // Uttar Pradesh is the one to check: its own entries open with
    // `Prayagraj` ahead of `Ambedkar Nagar` in the file.
    expect(districts[0]).toBe('Agra');

    for (let i = 1; i < districts.length; i += 1) {
      expect(districts[i - 1] <= districts[i]).toBe(true);
    }
  });

  it('matches the state name ignoring case and surrounding spaces', () => {
    // The legacy compared with equalsIgnoreCase; a restored draft or a server
    // row may not carry the asset's own casing.
    expect(districtsOf('  maharashtra  ')).toEqual(districtsOf('Maharashtra'));
    expect(districtsOf('MAHARASHTRA')).toEqual(districtsOf('Maharashtra'));
  });

  // 3 -------------------------------------------------------------------------

  it('returns an empty list for an empty, unknown or whitespace-only state', () => {
    expect(districtsOf('')).toEqual([]);
    expect(districtsOf('   ')).toEqual([]);
    expect(districtsOf('Atlantis')).toEqual([]);
  });
});

describe('stateHasDistricts', () => {

  // 4 -------------------------------------------------------------------------

  it('is true for every state in the asset', () => {
    // So the District field appears for all 35, and the "a state with no
    // districts" branch is unreachable with today's data. Fails loudly if the
    // shared file ever adds a district-less state — at which point the UI
    // already handles it, because one call gates both cases.
    for (const name of listStates()) {
      expect(stateHasDistricts(name)).toBe(true);
    }
  });

  it('is false for no state at all, which is what hides the District field', () => {
    // `applyDistrictAvailability` ran on load with an empty state name in the
    // legacy too, and the card went GONE. One call, both cases.
    expect(stateHasDistricts('')).toBe(false);
    expect(stateHasDistricts('Atlantis')).toBe(false);
  });
});

describe('isKnownState', () => {

  // 5 -------------------------------------------------------------------------

  it('matches ignoring case and surrounding spaces', () => {
    expect(isKnownState('Maharashtra')).toBe(true);
    expect(isKnownState('maharashtra')).toBe(true);
    expect(isKnownState('  MAHARASHTRA  ')).toBe(true);
  });

  it('rejects the legacy placeholder and anything not in the asset', () => {
    // `Select` is the exact value `areValidFields()` let through into
    // `state_province`, because it computed the membership check and then
    // never read the result.
    expect(isKnownState('Select')).toBe(false);
    expect(isKnownState('Atlantis')).toBe(false);
    expect(isKnownState('')).toBe(false);
  });
});

describe('isKnownDistrict', () => {

  // 6 -------------------------------------------------------------------------

  it('accepts a district of that state', () => {
    expect(isKnownDistrict('Maharashtra', 'Pune')).toBe(true);
    expect(isKnownDistrict('  maharashtra ', '  pune ')).toBe(true);
  });

  it('rejects a real district of the WRONG state', () => {
    // The point of taking both arguments. A flat "is this a district
    // anywhere" check would pass this.
    expect(isKnownDistrict('Maharashtra', 'Chennai')).toBe(false);
  });

  it('rejects an empty district and an unknown state', () => {
    expect(isKnownDistrict('Maharashtra', '')).toBe(false);
    expect(isKnownDistrict('Maharashtra', '   ')).toBe(false);
    expect(isKnownDistrict('Atlantis', 'Pune')).toBe(false);
  });
});

describe('the asset itself', () => {

  // 7 -------------------------------------------------------------------------

  it('carries no Hindi name keys, so English names are the only labels', () => {
    // The legacy's StateData and DistData declared `state-hi` and `name-hi`
    // and read them whenever the app language was not English — against data
    // that has never had them, which would have filled the dropdown with
    // nulls. This is why the port reads `state` and `name` only, always.
    const stateKeys = new Set<string>();
    const districtKeys = new Set<string>();

    for (const entry of rawAsset.states) {
      for (const key of Object.keys(entry)) stateKeys.add(key);
      for (const district of entry.districts) {
        for (const key of Object.keys(district)) districtKeys.add(key);
      }
    }

    expect([...stateKeys].sort()).toEqual(['districts', 'state']);
    expect([...districtKeys].sort()).toEqual(['name', 'tahasil']);
  });
});

describe('encodeCityVillage', () => {

  // 8 -------------------------------------------------------------------------

  it('joins the district and the village with a colon', () => {
    expect(encodeCityVillage('Maharashtra', 'Pune', 'Sinnar')).toBe('Pune:Sinnar');
  });

  // 9 -------------------------------------------------------------------------

  it('writes the bare village when no district was chosen, never a leading colon', () => {
    // The legacy's own fix, carried. `:Sinnar` in city_village is a row
    // nothing downstream can read back correctly.
    expect(encodeCityVillage('Maharashtra', '', 'Sinnar')).toBe('Sinnar');
    expect(encodeCityVillage('Maharashtra', '   ', 'Sinnar')).toBe('Sinnar');
  });

  it('drops the district when the state does not list districts', () => {
    // The guard keys on the state as well as the district, so a stale
    // district left over from a previous state cannot be written under one
    // that has none.
    expect(encodeCityVillage('Atlantis', 'Pune', 'Sinnar')).toBe('Sinnar');
    expect(encodeCityVillage('', 'Pune', 'Sinnar')).toBe('Sinnar');
  });

  // 10 ------------------------------------------------------------------------

  it('trims both parts', () => {
    expect(encodeCityVillage('Maharashtra', '  Pune  ', '  Sinnar  ')).toBe('Pune:Sinnar');
    expect(encodeCityVillage('Maharashtra', '', '  Sinnar  ')).toBe('Sinnar');
  });
});

describe('decodeCityVillage', () => {

  // 11 ------------------------------------------------------------------------

  it('splits the encoded shape back into two', () => {
    expect(decodeCityVillage('Pune:Sinnar')).toEqual({ district: 'Pune', village: 'Sinnar' });
  });

  // 12 ------------------------------------------------------------------------

  it('treats a bare value as the village', () => {
    // Older rows and server-written rows have this shape, so the reader has
    // to tolerate both.
    expect(decodeCityVillage('Sinnar')).toEqual({ district: '', village: 'Sinnar' });
  });

  // 13 ------------------------------------------------------------------------

  it('handles the empty and half-empty shapes', () => {
    expect(decodeCityVillage('')).toEqual({ district: '', village: '' });
    expect(decodeCityVillage('   ')).toEqual({ district: '', village: '' });
    expect(decodeCityVillage('Pune:')).toEqual({ district: 'Pune', village: '' });
  });

  // 14 ------------------------------------------------------------------------

  it('splits at the FIRST colon and keeps the district', () => {
    // The legacy required exactly two parts and otherwise treated the whole
    // string as the village, so this row showed up whole in the village box
    // with the district silently dropped. Our own writes can never carry two
    // colons — the village rule rejects the character — but a server row can.
    expect(decodeCityVillage('Pune:Navi:Mumbai')).toEqual({
      district: 'Pune',
      village: 'Navi:Mumbai',
    });
  });
});

describe('the round trip', () => {

  // 15 ------------------------------------------------------------------------

  it('returns the original for both shapes', () => {
    for (const stored of ['Pune:Sinnar', 'Sinnar']) {
      const { district, village } = decodeCityVillage(stored);

      expect(encodeCityVillage('Maharashtra', district, village)).toBe(stored);
    }
  });
});
