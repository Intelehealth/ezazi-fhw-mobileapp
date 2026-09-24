import { useState } from 'react';
import { StatChipComponent } from '../../components/dashboard/stat-chip.component';
import { CaseSectionComponent } from '../../components/dashboard/case-section.component';
import type { CaseSectionKey, VisitRow } from './dashboard.types';
import {
  COMPLETED_CASES,
  IN_PROGRESS_CASES,
  PRIORITY_CASES,
} from './dashboard.mock-data';
import prioritySquare from '../../assets/svgs/priority-square.svg';
import prescriptionSquare from '../../assets/svgs/prescription-square.svg';
import prescriptionCompletedSquare from '../../assets/svgs/prescription-completed-square.svg';

/**
 * Ports dashboard.component.html's stat chips + accordion of case tables
 * (Priority / In-progress / Completed) — the ELCG doctor's post-login
 * landing page. Data is static (see dashboard.mock-data.ts) until the visit
 * API lands in @ezazi/api-client; layout, columns and interactions
 * (search, expand/collapse, pagination) match the Angular source 1:1 so
 * wiring real data later doesn't require reshaping the UI.
 */
export function DashboardComponent() {
  const [expandedSections, setExpandedSections] = useState<
    Record<CaseSectionKey, boolean>
  >({
    priority: true,
    'in-progress': true,
    completed: false,
  });

  const allExpanded = Object.values(expandedSections).every(Boolean);

  function toggleSection(key: CaseSectionKey) {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleAll() {
    const next = !allExpanded;
    setExpandedSections({
      priority: next,
      'in-progress': next,
      completed: next,
    });
  }

  function handleRowClick(row: VisitRow) {
    // dashboard.component.html routes to `/dashboard/elcg/:uuid` per row —
    // that partogram detail route doesn't exist in this app yet.
    console.info('Open visit', row.uuid);
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <StatChipComponent
          tone="red"
          count={PRIORITY_CASES.length}
          label="Priority cases"
          icon={<img src={prioritySquare} alt="" className="w-11" />}
        />
        <StatChipComponent
          tone="blue"
          count={IN_PROGRESS_CASES.length}
          label="In-progress cases"
          icon={<img src={prescriptionSquare} alt="" className="w-11" />}
        />
        <StatChipComponent
          tone="outline"
          count={COMPLETED_CASES.length}
          label="Completed cases"
          icon={
            <img src={prescriptionCompletedSquare} alt="" className="w-11" />
          }
        />
      </div>

      <div className="mt-3 mb-2 flex justify-end">
        <button
          type="button"
          onClick={toggleAll}
          className="cursor-pointer text-sm text-[#7F7B92]"
        >
          {allExpanded ? 'Hide all ▲' : 'Show all ▼'}
        </button>
      </div>

      <CaseSectionComponent
        icon={<img src={prioritySquare} alt="" className="w-11" />}
        title="Priority cases"
        helpText="In-progress high priority cases"
        count={PRIORITY_CASES.length}
        rows={PRIORITY_CASES}
        variant="active"
        emptyMessage="No any priority cases."
        searchPlaceholder="Search priority cases"
        isExpanded={expandedSections.priority}
        onToggle={() => toggleSection('priority')}
        onRowClick={handleRowClick}
      />

      <CaseSectionComponent
        icon={<img src={prescriptionSquare} alt="" className="w-11" />}
        title="In-progress cases"
        helpText="In-progress normal cases"
        count={IN_PROGRESS_CASES.length}
        rows={IN_PROGRESS_CASES}
        variant="active"
        emptyMessage="No any normal cases."
        searchPlaceholder="Search in-progress cases"
        isExpanded={expandedSections['in-progress']}
        onToggle={() => toggleSection('in-progress')}
        onRowClick={handleRowClick}
      />

      <CaseSectionComponent
        icon={<img src={prescriptionCompletedSquare} alt="" className="w-11" />}
        title="Completed cases"
        helpText="Completed cases"
        count={COMPLETED_CASES.length}
        rows={COMPLETED_CASES}
        variant="completed"
        emptyMessage="No any completed cases."
        searchPlaceholder="Search completed cases"
        isExpanded={expandedSections.completed}
        onToggle={() => toggleSection('completed')}
        onRowClick={handleRowClick}
      />
    </div>
  );
}
