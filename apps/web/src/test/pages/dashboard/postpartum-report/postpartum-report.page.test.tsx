import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PostpartumReportPage from '../../../../pages/dashboard/postpartum-report/postpartum-report.page';

/* Only the visit uuid handed down matters here; the module has its own suite. */
vi.mock(
  '../../../../modules/dashboard/postpartum-report/postpartum-report.component',
  () => ({
    PostpartumReportComponent: ({ visitUuid }: { visitUuid: string }) => (
      <p>Postpartum report for {visitUuid}</p>
    ),
  })
);

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/dashboard/postpartum-report/visit-7']}>
      <Routes>
        <Route
          path="/dashboard/postpartum-report/:visitUuid"
          element={<PostpartumReportPage />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('PostpartumReportPage', () => {
  it('shows the report of the visit in the URL', () => {
    renderPage();

    expect(
      screen.getByText('Postpartum report for visit-7')
    ).toBeInTheDocument();
  });

  it('renders without the sidebar and header, as the Angular stage3 route does', () => {
    renderPage();

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /sidebar/i })
    ).not.toBeInTheDocument();
  });
});
