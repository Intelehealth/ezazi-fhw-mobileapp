import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardComponent } from '../../../modules/dashboard/dashboard.component';
import {
  COMPLETED_CASES,
  IN_PROGRESS_CASES,
  PRIORITY_CASES,
} from '../../../modules/dashboard/dashboard.mock-data';

describe('DashboardComponent', () => {
  it('shows a stat chip count per case section', () => {
    render(<DashboardComponent />);

    expect(
      screen.getByText(`Priority cases (${PRIORITY_CASES.length})`)
    ).toBeInTheDocument();
    expect(
      screen.getByText(`In-progress cases (${IN_PROGRESS_CASES.length})`)
    ).toBeInTheDocument();
    expect(
      screen.getByText(`Completed cases (${COMPLETED_CASES.length})`)
    ).toBeInTheDocument();
  });

  it('starts with priority and in-progress expanded, and completed collapsed, matching dashboard.component.html', () => {
    render(<DashboardComponent />);

    expect(
      screen.getByText(PRIORITY_CASES[0].patient.identifier)
    ).toBeInTheDocument();
    expect(
      screen.getByText(IN_PROGRESS_CASES[0].patient.identifier)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(COMPLETED_CASES[0].patient.identifier)
    ).not.toBeInTheDocument();
  });

  it('"Show all" expands every section, including completed', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<DashboardComponent />);

    await user.click(screen.getByRole('button', { name: 'Show all ▼' }));

    expect(
      screen.getByText(COMPLETED_CASES[0].patient.identifier)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Hide all ▲' })
    ).toBeInTheDocument();
  });
});
