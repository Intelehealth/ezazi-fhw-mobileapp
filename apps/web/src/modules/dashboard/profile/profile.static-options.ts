/**
 * Dropdown option lists that are genuinely hardcoded in the reference
 * app too (profile.component.ts's own `professions`/`specializations`/
 * `wards` arrays) — not a stand-in for an API call, unlike Facility Name's
 * options (see hooks/queries/useProviderProfile.ts's GET /location call).
 */
export const QUALIFICATION_OPTIONS = ['MBBS', 'MBBS, MD', 'Other'];

export const SPECIALIZATION_OPTIONS = ['Obstetrician & Gynecologist'];

export const WARD_OPTIONS = ['Post Natal Ward', 'Labor Ward'];
