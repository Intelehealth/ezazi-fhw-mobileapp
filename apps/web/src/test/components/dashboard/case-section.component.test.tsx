import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CaseSectionComponent } from '../../../components/dashboard/case-section.component';
import type { VisitRow } from '../../../modules/dashboard/dashboard.types';

const ROWS: VisitRow[] = [
  {
    uuid: 'visit-1',
    patient: {
      name: 'Asha Devi',
      identifier: 'ELCG-1042',
      gender: 'F',
      age: 27,
    },
    stage: 2,
    alertCount: 3,
    cervixPlotX: '6 cm',
    descentPlotO: '2',
    alarmingReadings: [],
    provider: 'Nurse Kavita Rao',
    isUnseen: true,
    inLabourDuration: '3h 20m',
  },
  {
    uuid: 'visit-2',
    patient: {
      name: 'Meena Kumari',
      identifier: 'ELCG-1038',
      gender: 'F',
      age: 32,
    },
    stage: 3,
    alertCount: 1,
    cervixPlotX: '10 cm',
    descentPlotO: '4',
    alarmingReadings: [],
    provider: 'Dr. Sameer Joshi',
    isUnseen: false,
    inLabourDuration: '6h 05m',
  },
];

function renderSection(
  overrides: Partial<React.ComponentProps<typeof CaseSectionComponent>> = {}
) {
  const onToggle = vi.fn();
  const utils = render(
    <CaseSectionComponent
      icon={<span />}
      title="Priority cases"
      helpText="In-progress high priority cases"
      count={ROWS.length}
      rows={ROWS}
      variant="active"
      emptyMessage="No any priority cases."
      searchPlaceholder="Search priority cases"
      isExpanded
      onToggle={onToggle}
      {...overrides}
    />
  );
  return { ...utils, onToggle };
}

describe('CaseSectionComponent', () => {
  it('renders the title with count and both rows when expanded', () => {
    renderSection();

    expect(screen.getByText('Priority cases (2)')).toBeInTheDocument();
    expect(screen.getByText('ELCG-1042')).toBeInTheDocument();
    expect(screen.getByText('ELCG-1038')).toBeInTheDocument();
  });

  it('hides the table and search box when collapsed', () => {
    renderSection({ isExpanded: false });

    expect(screen.queryByText('ELCG-1042')).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Search priority cases')
    ).not.toBeInTheDocument();
  });

  it('calls onToggle when the header is clicked', () => {
    const { onToggle } = renderSection();

    fireEvent.click(screen.getByText('Priority cases (2)'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('filters rows by patient identifier as the user types', () => {
    renderSection();

    fireEvent.change(screen.getByPlaceholderText('Search priority cases'), {
      target: { value: '1038' },
    });

    expect(screen.queryByText('ELCG-1042')).not.toBeInTheDocument();
    expect(screen.getByText('ELCG-1038')).toBeInTheDocument();
  });

  it('filters rows by patient name and clears back to all rows on reset', () => {
    renderSection();
    const searchInput = screen.getByPlaceholderText('Search priority cases');

    fireEvent.change(searchInput, { target: { value: 'meena' } });
    expect(screen.queryByText('ELCG-1042')).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Reset priority cases search' })
    );
    expect(screen.getByText('ELCG-1042')).toBeInTheDocument();
    expect(screen.getByText('ELCG-1038')).toBeInTheDocument();
  });

  it('calls onToggle on Enter or Space, but not on other keys', () => {
    const { onToggle } = renderSection();
    const header = screen
      .getByText('Priority cases (2)')
      .closest('[role="button"]')!;

    fireEvent.keyDown(header, { key: 'a' });
    expect(onToggle).not.toHaveBeenCalled();

    fireEvent.keyDown(header, { key: 'Enter' });
    fireEvent.keyDown(header, { key: ' ' });
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('exposes the help text as a tooltip on the info icon', () => {
    renderSection();

    expect(
      screen.getByText('In-progress high priority cases', {
        selector: '[role="tooltip"]',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('In-progress high priority cases')
    ).toBeInTheDocument();
  });

  it('shows a loading message instead of the table while the first page loads', () => {
    renderSection({ rows: [], count: 0, isLoading: true });

    expect(screen.getByRole('status')).toHaveTextContent('Loading cases…');
    expect(
      screen.queryByText('No any priority cases.')
    ).not.toBeInTheDocument();
  });

  it('shows the error with a Retry button when the section failed to load', () => {
    const onRetry = vi.fn();
    renderSection({
      rows: [],
      count: 0,
      errorMessage: 'Unable to reach the server.',
      onRetry,
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Unable to reach the server.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps showing loaded rows when a background refresh fails', () => {
    renderSection({ errorMessage: 'Unable to reach the server.' });

    expect(screen.getByText('ELCG-1042')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it("pages over the server's total and asks for more rows past the loaded ones", () => {
    const onLoadMore = vi.fn();
    renderSection({ count: 12, hasMore: true, onLoadMore });

    expect(screen.getByText('1 – 5 of 12')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('Loading more cases…');
  });

  it('does not ask for more rows while a search is filtering the loaded ones', () => {
    const onLoadMore = vi.fn();
    renderSection({ count: 12, hasMore: true, onLoadMore });

    fireEvent.change(screen.getByPlaceholderText('Search priority cases'), {
      target: { value: 'ELCG' },
    });

    expect(screen.getByText('1 – 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('offers Retry when loading the next rows failed', () => {
    const onLoadMore = vi.fn();
    const { rerender } = renderSection({
      count: 12,
      hasMore: true,
      onLoadMore,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    rerender(
      <CaseSectionComponent
        icon={<span />}
        title="Priority cases"
        helpText="In-progress high priority cases"
        count={12}
        rows={ROWS}
        variant="active"
        emptyMessage="No any priority cases."
        searchPlaceholder="Search priority cases"
        isExpanded
        onToggle={vi.fn()}
        hasMore
        loadMoreErrorMessage="Could not load more cases."
        onLoadMore={onLoadMore}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load more cases.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });
});
