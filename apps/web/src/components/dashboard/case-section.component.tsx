import { useMemo, useState, type ReactNode } from 'react';
import type { VisitRow } from '../../modules/dashboard/dashboard.types';
import {
  VisitTableComponent,
  type VisitTableVariant,
} from './visit-table.component';
import { VisitPaginationComponent } from './visit-pagination.component';
import searchIcon from '../../assets/svgs/search-icon.svg';
import chevronIcon from '../../assets/svgs/chevron-down.svg';

interface CaseSectionComponentProps {
  icon: ReactNode;
  title: string;
  helpText: string;
  count: number;
  rows: VisitRow[];
  variant: VisitTableVariant;
  emptyMessage: string;
  searchPlaceholder: string;
  isExpanded: boolean;
  onToggle: () => void;
  onRowClick?: (row: VisitRow) => void;
}

const DEFAULT_PAGE_SIZE = 5;

/**
 * One `<mat-expansion-panel>` from dashboard.component.html — header
 * (icon, title, help tooltip, search box) collapsing a case table. Search
 * and pagination are local UI state (client-side filtering over the rows
 * this pass already has in memory); only the expand/collapse flag is
 * lifted, so the dashboard's "Show all / Hide all" button can drive it.
 */
export function CaseSectionComponent({
  icon,
  title,
  helpText,
  count,
  rows,
  variant,
  emptyMessage,
  searchPlaceholder,
  isExpanded,
  onToggle,
  onRowClick,
}: CaseSectionComponentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = DEFAULT_PAGE_SIZE;

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      row =>
        row.patient.identifier.toLowerCase().includes(term) ||
        row.patient.name.toLowerCase().includes(term)
    );
  }, [rows, searchTerm]);

  const pagedRows = filteredRows.slice(
    pageIndex * pageSize,
    (pageIndex + 1) * pageSize
  );

  function handleSearchChange(value: string) {
    setSearchTerm(value);
    setPageIndex(0);
  }

  return (
    <div className="mb-3 rounded-xl border border-[#e5e7eb]">
      {/* A <button> here would put the search box's own <button>/<input>
          (rendered inline below, once expanded) illegally inside a <button> —
          role="button" + a key handler keeps this keyboard-accessible without
          that nesting violation. */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') onToggle();
        }}
        className="flex w-full cursor-pointer items-center gap-2 p-4 text-left"
      >
        <span className="w-11 shrink-0">{icon}</span>
        <h6 className="mb-0 ml-2 font-bold">
          {title} ({count})
        </h6>
        {/* matTooltip's styled bubble, not just the browser's native `title`
            attribute (which is slow to appear and unstyled) — shown on
            hover/focus, positioned to the right like the Angular
            `matTooltipPosition="right"` original. */}
        <span className="group/tooltip relative">
          <span
            tabIndex={0}
            aria-label={helpText}
            className="font-bold text-[#2E1E91] focus:outline-none"
          >
            ⓘ
          </span>
          <span
            role="tooltip"
            className="pointer-events-none absolute top-1/2 left-full z-30 ml-2 -translate-y-1/2 rounded-md bg-[#7F7B92] px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
          >
            {helpText}
          </span>
        </span>

        {isExpanded && (
          <div
            onClick={e => e.stopPropagation()}
            // ml-auto here does the actual right-alignment (this is the
            // last thing before the chevron once expanded) — the chevron
            // below no longer also claims ml-auto in that case, since two
            // siblings both set to auto-margin split the free space
            // *between* them instead of flush against the container edge,
            // which is what was leaving this search box stranded
            // mid-header instead of pinned to the right.
            className="ml-auto flex h-[46px] w-[300px] max-w-[60vw] items-center rounded-md border border-[rgba(127,123,146,0.5)] bg-white"
          >
            <span className="pl-2">
              {!searchTerm && (
                <img src={searchIcon} alt="" width={20} height={20} />
              )}
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full border-none bg-transparent px-4 py-0 text-base outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                aria-label={`Reset ${title.toLowerCase()} search`}
                onClick={() => handleSearchChange('')}
                className="cursor-pointer px-2 leading-none"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* mat-expansion-panel's default indicator (chevron-down.svg, the
            same asset used elsewhere for dropdown carets): down when
            collapsed, rotated to point up when expanded — not a generic
            unicode triangle. */}
        <img
          src={chevronIcon}
          alt=""
          // chevron-down.svg's own stroke is a light gray (#7F7B92) —
          // brightness-0 forces it fully black instead. ml-auto only when
          // collapsed (no search box in the row to already claim it) — see
          // the search box's own comment above.
          className={`h-4 w-4 shrink-0 brightness-0 transition-transform ${
            isExpanded ? 'ml-2 -rotate-90' : 'ml-auto rotate-90'
          }`}
        />
      </div>

      {isExpanded && (
        <div className="px-4 pb-4">
          <VisitTableComponent
            rows={pagedRows}
            variant={variant}
            emptyMessage={emptyMessage}
            onRowClick={onRowClick}
          />
          <VisitPaginationComponent
            pageIndex={pageIndex}
            pageSize={pageSize}
            totalCount={filteredRows.length}
            onPageIndexChange={setPageIndex}
          />
        </div>
      )}
    </div>
  );
}
