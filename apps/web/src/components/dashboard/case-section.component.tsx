import { useMemo, useState, type ReactNode } from 'react';
import type { VisitRow } from '../../modules/dashboard/dashboard.types';
import {
  VisitTableComponent,
  type VisitTableVariant,
} from './visit-table.component';
import { VisitPaginationComponent } from './visit-pagination.component';
import searchIcon from '../../assets/svgs/search-icon.svg';

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
        <span
          className="text-[#7F7B92]"
          title={helpText}
          aria-label="help icon"
        >
          ⓘ
        </span>

        {isExpanded && (
          <div
            onClick={e => e.stopPropagation()}
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

        <span className="ml-auto shrink-0 text-[#7F7B92]">
          {isExpanded ? '▲' : '▼'}
        </span>
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
