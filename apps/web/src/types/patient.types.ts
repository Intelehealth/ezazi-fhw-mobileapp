/**
 * Shapes of the OpenMRS `/patient` search and `/visit` lookups the global
 * patient search uses (main-container.component.ts's search() and
 * searched-patients.component.ts's view() in intelehealth-doctor-webapp).
 */
export interface OpenMrsPatientIdentifier {
  identifierType: { name: string };
  identifier: string;
}

/** One row of GET /patient?q=… with PATIENT_SEARCH_REPRESENTATION. */
export interface OpenMrsPatientSearchResult {
  uuid: string;
  identifiers: OpenMrsPatientIdentifier[];
  person: {
    display: string;
    gender: string;
    age: number;
  };
}

/** The only field of GET /visit?patient=… the search flow reads. */
export interface OpenMrsPatientVisit {
  uuid: string;
}
