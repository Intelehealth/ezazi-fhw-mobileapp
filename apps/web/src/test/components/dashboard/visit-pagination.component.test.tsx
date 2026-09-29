import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VisitPaginationComponent } from '../../../components/dashboard/visit-pagination.component';

describe('VisitPaginationComponent', () => {
  it('shows the "0 – 0 of 0" range when there is no data', () => {
    render(
      <VisitPaginationComponent
        pageIndex={0}
        pageSize={5}
        totalCount={0}
        onPageIndexChange={vi.fn()}
      />
    );

    expect(screen.getByText('0 – 0 of 0')).toBeInTheDocument();
  });

  it('shows the current page range for a middle page', () => {
    render(
      <VisitPaginationComponent
        pageIndex={1}
        pageSize={5}
        totalCount={12}
        onPageIndexChange={vi.fn()}
      />
    );

    expect(screen.getByText('6 – 10 of 12')).toBeInTheDocument();
  });

  it('disables Previous on the first page and calls onPageIndexChange(pageIndex - 1) once past it', () => {
    const onPageIndexChange = vi.fn();
    render(
      <VisitPaginationComponent
        pageIndex={1}
        pageSize={5}
        totalCount={12}
        onPageIndexChange={onPageIndexChange}
      />
    );

    const previous = screen.getByRole('button', { name: 'Previous page' });
    expect(previous).not.toBeDisabled();

    fireEvent.click(previous);
    expect(onPageIndexChange).toHaveBeenCalledWith(0);
  });

  it('disables Previous on the first page itself', () => {
    render(
      <VisitPaginationComponent
        pageIndex={0}
        pageSize={5}
        totalCount={12}
        onPageIndexChange={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });

  it('disables Next on the last page and calls onPageIndexChange(pageIndex + 1) before it', () => {
    const onPageIndexChange = vi.fn();
    render(
      <VisitPaginationComponent
        pageIndex={0}
        pageSize={5}
        totalCount={12}
        onPageIndexChange={onPageIndexChange}
      />
    );

    const next = screen.getByRole('button', { name: 'Next page' });
    expect(next).not.toBeDisabled();

    fireEvent.click(next);
    expect(onPageIndexChange).toHaveBeenCalledWith(1);
  });

  it('disables Next on the last page itself', () => {
    render(
      <VisitPaginationComponent
        pageIndex={2}
        pageSize={5}
        totalCount={12}
        onPageIndexChange={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });
});
