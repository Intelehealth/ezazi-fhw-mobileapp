interface VisitPaginationComponentProps {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  onPageIndexChange: (pageIndex: number) => void;
}

/**
 * Stands in for dashboard.component.html's `<mat-paginator>` — "x – y of z"
 * plus prev/next, client-side only since this pass has no VisitService
 * page-fetch to back it. No page-size control: the reference UI
 * (ezazi.intelehealth.org/#/dashboard) doesn't surface one either, it's
 * fixed per section (see case-section.component.tsx's DEFAULT_PAGE_SIZE).
 */
export function VisitPaginationComponent({
  pageIndex,
  pageSize,
  totalCount,
  onPageIndexChange,
}: VisitPaginationComponentProps) {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : pageIndex * pageSize + 1;
  const rangeEnd = Math.min(totalCount, (pageIndex + 1) * pageSize);

  return (
    <div className="flex items-center justify-end gap-4 py-2 text-sm text-[#7F7B92]">
      <span>
        {rangeStart} – {rangeEnd} of {totalCount}
      </span>
      <button
        type="button"
        aria-label="Previous page"
        disabled={pageIndex === 0}
        onClick={() => onPageIndexChange(pageIndex - 1)}
        className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Next page"
        disabled={pageIndex >= pageCount - 1}
        onClick={() => onPageIndexChange(pageIndex + 1)}
        className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
      >
        ›
      </button>
    </div>
  );
}
