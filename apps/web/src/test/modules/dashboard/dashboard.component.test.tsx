import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

    await user.click(screen.getByRole('button', { name: 'Show all' }));

    expect(
      screen.getByText(COMPLETED_CASES[0].patient.identifier)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide all' })).toBeInTheDocument();
  });

  it('collapses just the Priority section on its own header click, leaving In-progress expanded', () => {
    render(<DashboardComponent />);

    fireEvent.click(screen.getByText(`Priority cases (${PRIORITY_CASES.length})`));

    expect(
      screen.queryByText(PRIORITY_CASES[0].patient.identifier)
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(IN_PROGRESS_CASES[0].patient.identifier)
    ).toBeInTheDocument();
  });

  it('toggles the In-progress and Completed sections independently on their own header clicks', () => {
    render(<DashboardComponent />);

    fireEvent.click(
      screen.getByText(`In-progress cases (${IN_PROGRESS_CASES.length})`)
    );
    expect(
      screen.queryByText(IN_PROGRESS_CASES[0].patient.identifier)
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByText(`Completed cases (${COMPLETED_CASES.length})`)
    );
    expect(
      screen.getByText(COMPLETED_CASES[0].patient.identifier)
    ).toBeInTheDocument();
  });

  it('logs the visit uuid when a row is clicked (partogram detail route not built yet)', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    render(<DashboardComponent />);

    fireEvent.click(screen.getByText(PRIORITY_CASES[0].patient.identifier));

    expect(infoSpy).toHaveBeenCalledWith('Open visit', PRIORITY_CASES[0].uuid);
    infoSpy.mockRestore();
  });
});
