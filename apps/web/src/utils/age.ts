/**
 * Whole years between `birthdate` (YYYY-MM-DD) and today, or null when it is
 * blank or not a parseable date. The one age computation the profile screens
 * share: the read-only Age field (profile.component.ts's `age`), the
 * under-18 validation and the age sent to OpenMRS on save.
 */
export function calculateAge(birthdate: string): number | null {
  if (!birthdate) return null;
  const dob = new Date(birthdate);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;

  return age;
}
