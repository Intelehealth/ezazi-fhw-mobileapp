import { useState } from 'react';
import searchIcon from '../../assets/svgs/search-icon.svg';
import { useSearchPatients } from '../../hooks/mutations/useSearchPatients';
import { showToast } from '../../services/toast';
import type { OpenMrsPatientSearchResult } from '../../types/patient.types';
import { SearchedPatientsModalComponent } from '../dashboard/searched-patients-modal.component';

const MIN_KEYWORD_LENGTH = 3;

/**
 * Ports the header's patient search (main-container.component.html's
 * `searchForm` + main-container.component.ts's search()): Enter or the
 * magnifier runs the search, anything under 3 characters only shows a
 * warning toast, and the matches open in the "Patients" dialog (see
 * searched-patients-modal.component.tsx). The box is cleared once results
 * come back, like the Angular `searchForm.reset()`.
 */
export function PatientSearchComponent() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<OpenMrsPatientSearchResult[] | null>(
    null
  );
  const searchPatients = useSearchPatients();

  function search() {
    if (keyword.length < MIN_KEYWORD_LENGTH) {
      showToast(
        'Warning',
        'Please enter minimum 3 characters to search patient....',
        'warning'
      );
      return;
    }

    searchPatients.mutate(keyword, {
      onSuccess: patients => {
        setResults(patients);
        setKeyword('');
      },
    });
  }

  return (
    <>
      <div className="flex h-[52px] w-[25vw] items-center rounded-lg border-2 border-[rgba(178,175,190,0.2)] bg-[#FAF9FF] px-4">
        <input
          type="text"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyUp={e => {
            if (e.key === 'Enter') search();
          }}
          placeholder="Search by patient name or ID"
          aria-label="Search by patient name or ID"
          className="w-full border-none bg-transparent text-base outline-none"
        />
        <button
          type="button"
          onClick={search}
          aria-label="Search patients"
          disabled={searchPatients.isPending}
          className="cursor-pointer disabled:cursor-not-allowed"
        >
          <img src={searchIcon} alt="" width={20} height={20} />
        </button>
      </div>

      {results && (
        <SearchedPatientsModalComponent
          patients={results}
          onClose={() => setResults(null)}
        />
      )}
    </>
  );
}
