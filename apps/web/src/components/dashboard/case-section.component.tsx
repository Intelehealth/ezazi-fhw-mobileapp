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
  /** Cases in the whole section on the server — not just the rows loaded so far. */
  count: number;
  /** The rows loaded so far, newest first. */
  rows: VisitRow[];
  variant: VisitTableVariant;
  emptyMessage: string;
  searchPlaceholder: string;
  isExpanded: boolean;
  onToggle: () => void;
  onRowClick?: (row: VisitRow) => void;
  /** No rows yet and the first load is still in flight. */
  isLoading?: boolean;
  /** Set when the section could not be loaded; shown in place of the table, with a Retry button. */
  errorMessage?: string | null;
  onRetry?: () => void;
  /** More rows exist on the server than are in `rows`. */
  hasMore?: boolean;
  isLoadingMore?: boolean;
  /** Set when loading further rows failed; the rows already loaded stay visible. */
  loadMoreErrorMessage?: string | null;
  onLoadMore?: () => void;
}

const DEFAULT_PAGE_SIZE = 5;

/**
 * Loading / failure placeholder shown inside an expanded section. `role`
 * makes screen readers announce it: "status" politely, "alert" at once.
 */
function SectionMessage({
  message,
  isError = false,
  onRetry,
}: {
  message: string;
  isError?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex flex-col items-center gap-3 py-6 text-center text-sm ${
        isError ? 'text-red-600' : 'text-[#7F7B92]'
      }`}
    >
      <p className="m-0">{message}</p>
      {isError && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer rounded-md border border-[#2E1E91] px-4 py-1.5 font-bold text-[#2E1E91]"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * One `<mat-expansion-panel>` from dashboard.component.html — header
 * (icon, title, help tooltip, search box) collapsing a case table. Search
 * and pagination are local UI state; only the expand/collapse flag is
 * lifted, so the dashboard's "Show all / Hide all" button can drive it.
 *
 * Paging walks the rows already loaded and calls `onLoadMore` once a page
 * reaches past them. Search filters the loaded rows only, exactly like the
 * Angular table's filterPredicate.
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
  isLoading = false,
  errorMessage = null,
  onRetry,
  hasMore = false,
  isLoadingMore = false,
  loadMoreErrorMessage = null,
  onLoadMore,
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

  /*
   * Unfiltered, the paginator spans the server's total so later pages can be
   * reached (and loaded); while searching it spans the matching rows only.
   */
  const isSearching = searchTerm.trim().length > 0;
  const paginatorTotal = isSearching
    ? filteredRows.length
    : Math.max(count, rows.length);
  const pageCount = Math.max(1, Math.ceil(paginatorTotal / pageSize));
  /* A refresh can shrink the list under the current page — never point past the end. */
  const currentPageIndex = Math.min(pageIndex, pageCount - 1);

  const pagedRows = filteredRows.slice(
    currentPageIndex * pageSize,
    (currentPageIndex + 1) * pageSize
  );

  function handleSearchChange(value: string) {
    setSearchTerm(value);
    setPageIndex(0);
  }

  function handlePageIndexChange(nextPageIndex: number) {
    setPageIndex(nextPageIndex);
    const needsMoreRows = (nextPageIndex + 1) * pageSize > rows.length;
    if (!isSearching && needsMoreRows && hasMore) onLoadMore?.();
  }

  function renderBody() {
    if (rows.length === 0 && isLoading) {
      return <SectionMessage message="Loading cases…" />;
    }
    if (rows.length === 0 && errorMessage) {
      return (
        <SectionMessage message={errorMessage} isError onRetry={onRetry} />
      );
    }

    const isWaitingForPage = pagedRows.length === 0 && !isSearching;
    return (
      <>
        {isWaitingForPage && loadMoreErrorMessage ? (
          <SectionMessage
            message={loadMoreErrorMessage}
            isError
            onRetry={onLoadMore}
          />
        ) : isWaitingForPage && (isLoadingMore || hasMore) ? (
          <SectionMessage message="Loading more cases…" />
        ) : (
          <VisitTableComponent
            rows={pagedRows}
            variant={variant}
            emptyMessage={emptyMessage}
            onRowClick={onRowClick}
          />
        )}
        <VisitPaginationComponent
          pageIndex={currentPageIndex}
          pageSize={pageSize}
          totalCount={paginatorTotal}
          onPageIndexChange={handlePageIndexChange}
        />
      </>
    );
  }

  return (
    <div className="mb-6 rounded-[20px] bg-white shadow-[0px_4px_24px_rgba(31,28,58,0.08)]">
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
        className="flex w-full cursor-pointer items-center gap-2 p-6 text-left"
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
            <input
              type="text"
              value={searchTerm}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full border-none bg-transparent px-4 py-0 text-base outline-none"
            />
            {/* As in the Angular input-group-append: the search icon sits at
                the right end and gives way to the reset button once typed. */}
            {searchTerm ? (
              <button
                type="button"
                aria-label={`Reset ${title.toLowerCase()} search`}
                onClick={() => handleSearchChange('')}
                className="cursor-pointer px-2 leading-none"
              >
                ✕
              </button>
            ) : (
              <span className="shrink-0 pr-3">
                <img src={searchIcon} alt="" width={20} height={20} />
              </span>
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

      {isExpanded && <div className="px-6 pb-6">{renderBody()}</div>}
    </div>
  );
}
