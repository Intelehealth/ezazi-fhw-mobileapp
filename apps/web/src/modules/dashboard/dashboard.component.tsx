import { useState, type ReactNode } from 'react';
import { StatChipComponent } from '../../components/dashboard/stat-chip.component';
import { CaseSectionComponent } from '../../components/dashboard/case-section.component';
import type { VisitTableVariant } from '../../components/dashboard/visit-table.component';
import { useDashboardVisits } from '../../hooks/queries/useDashboardVisits';
import type { VisitListState } from '../../hooks/queries/useVisitList';
import { getApiErrorMessage } from '../../utils/error-message';
import type { CaseSectionKey } from './dashboard.types';
import prioritySquare from '../../assets/svgs/priority-square.svg';
import prescriptionSquare from '../../assets/svgs/prescription-square.svg';
import prescriptionCompletedSquare from '../../assets/svgs/prescription-completed-square.svg';
import chevronIcon from '../../assets/svgs/chevron-down.svg';

interface SectionConfig {
  key: CaseSectionKey;
  icon: string;
  tone: 'red' | 'blue' | 'outline';
  title: string;
  helpText: string;
  variant: VisitTableVariant;
  emptyMessage: string;
  searchPlaceholder: string;
}

/** The three sections, in dashboard.component.html's order, with its copy. */
const SECTIONS: SectionConfig[] = [
  {
    key: 'priority',
    icon: prioritySquare,
    tone: 'red',
    title: 'Priority cases',
    helpText: 'In-progress high priority cases',
    variant: 'active',
    emptyMessage: 'No any priority cases.',
    searchPlaceholder: 'Search priority cases',
  },
  {
    key: 'in-progress',
    icon: prescriptionSquare,
    tone: 'blue',
    title: 'In-progress cases',
    helpText: 'In-progress normal cases',
    variant: 'active',
    emptyMessage: 'No any normal cases.',
    searchPlaceholder: 'Search in-progress cases',
  },
  {
    key: 'completed',
    icon: prescriptionCompletedSquare,
    tone: 'outline',
    title: 'Completed cases',
    helpText: 'Completed cases',
    variant: 'completed',
    emptyMessage: 'No any completed cases.',
    searchPlaceholder: 'Search completed cases',
  },
];

const LOAD_FAILED_MESSAGE = 'Could not load cases. Please try again.';
const LOAD_MORE_FAILED_MESSAGE = 'Could not load more cases. Please try again.';

/** The stat-chip figure: unknown (a dash) until the section has loaded successfully. */
function chipCount(list: VisitListState): number | null {
  if (list.isLoading || (list.error && list.rows.length === 0)) return null;
  return list.totalCount;
}

function sectionIcon(src: string): ReactNode {
  return <img src={src} alt="" className="w-11" />;
}

/**
 * Ports dashboard.component.html's stat chips + accordion of case tables
 * (Priority / In-progress / Completed) — the ELCG doctor's post-login
 * landing page, backed by the portal's visit-list APIs (see
 * hooks/queries/useDashboardVisits.ts). Each section loads, fails and
 * retries on its own, so one failing list never blanks the other two.
 */
export function DashboardComponent() {
  const lists = useDashboardVisits();
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

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {SECTIONS.map(section => (
          <StatChipComponent
            key={section.key}
            tone={section.tone}
            count={chipCount(lists[section.key])}
            label={section.title}
            icon={sectionIcon(section.icon)}
          />
        ))}
      </div>

      <div className="mt-3 mb-2 flex justify-end">
        <button
          type="button"
          onClick={toggleAll}
          className="flex cursor-pointer items-center gap-1 text-sm text-[#7F7B92]"
        >
          {allExpanded ? 'Hide all' : 'Show all'}
          {/* Same chevron-down.svg as case-section.component.tsx's per-panel
              indicator (dashboard.component.html uses mat-icon
              expand_more/expand_less here — the same up/down chevron shape,
              not a generic unicode triangle). */}
          <img
            src={chevronIcon}
            alt=""
            className={`h-4 w-4 transition-transform ${allExpanded ? '-rotate-90' : 'rotate-90'}`}
          />
        </button>
      </div>

      {SECTIONS.map(section => {
        const list = lists[section.key];
        return (
          <CaseSectionComponent
            key={section.key}
            icon={sectionIcon(section.icon)}
            title={section.title}
            helpText={section.helpText}
            count={list.totalCount}
            rows={list.rows}
            variant={section.variant}
            emptyMessage={section.emptyMessage}
            searchPlaceholder={section.searchPlaceholder}
            isExpanded={expandedSections[section.key]}
            onToggle={() => toggleSection(section.key)}
            /*
             * No onRowClick yet: dashboard.component.html routes each row to
             * `/dashboard/elcg/:uuid`, and that partogram route isn't built.
             */
            isLoading={list.isLoading}
            errorMessage={
              list.error
                ? getApiErrorMessage(list.error, LOAD_FAILED_MESSAGE)
                : null
            }
            onRetry={list.retry}
            hasMore={list.hasMore}
            isLoadingMore={list.isLoadingMore}
            loadMoreErrorMessage={
              list.loadMoreError
                ? getApiErrorMessage(
                    list.loadMoreError,
                    LOAD_MORE_FAILED_MESSAGE
                  )
                : null
            }
            onLoadMore={list.loadMore}
          />
        );
      })}
    </div>
  );
}
