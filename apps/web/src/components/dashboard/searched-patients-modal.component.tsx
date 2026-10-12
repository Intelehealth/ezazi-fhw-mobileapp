import { useEffect } from 'react';
import { useOpenPatientVisit } from '../../hooks/mutations/useOpenPatientVisit';
import type { OpenMrsPatientSearchResult } from '../../types/patient.types';

interface SearchedPatientsModalComponentProps {
  patients: OpenMrsPatientSearchResult[];
  onClose: () => void;
}

/**
 * Ports searched-patients.component.html (intelehealth-doctor-webapp) — the
 * "Patients" dialog the header search opens: one row per match with the
 * first identifier (type above value), "name (gender, age)" and a View
 * button, or "No patients found!"; a Close action sits in the footer. Like
 * the Material dialog it replaces, it closes on Escape and on a backdrop
 * click.
 */
export function SearchedPatientsModalComponent({
  patients,
  onClose,
}: SearchedPatientsModalComponentProps) {
  const openVisit = useOpenPatientVisit(onClose);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="searched-patients-title"
        className="flex max-h-[90vh] w-[1086px] max-w-[90%] flex-col rounded-xl bg-white"
      >
        <div className="rounded-t-xl bg-[#EFE8FF] p-6">
          <h6
            id="searched-patients-title"
            className="mb-0 text-lg font-bold text-[#1B163A]"
          >
            Patients
          </h6>
        </div>

        <div className="overflow-auto">
          <table className="w-full">
            <tbody>
              {patients.length ? (
                patients.map(patient => (
                  <tr
                    key={patient.uuid}
                    className="border-b border-[rgba(178,175,190,0.2)]"
                  >
                    <th scope="row" className="px-4 py-3 text-left">
                      <div className="flex w-fit flex-col items-center justify-center whitespace-nowrap text-base font-bold text-[#1B163A]">
                        <span className="text-xs font-normal">
                          {patient.identifiers[0].identifierType.name}
                        </span>
                        {patient.identifiers[0].identifier}
                      </div>
                    </th>
                    <td className="px-4 py-3 text-base whitespace-nowrap text-[#1B163A]">
                      {patient.person.display} ({patient.person.gender},{' '}
                      {patient.person.age})
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openVisit.mutate(patient.uuid)}
                        disabled={openVisit.isPending}
                        className="h-12 cursor-pointer rounded-lg bg-[#2E1E91] px-6 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-3 text-center text-base text-[#1B163A]"
                  >
                    No patients found!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end border-t-2 border-[rgba(178,175,190,0.2)] p-2">
          <button
            type="button"
            onClick={onClose}
            className="mr-2 h-12 cursor-pointer rounded-lg bg-[#2E1E91] px-6 text-base font-bold text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
