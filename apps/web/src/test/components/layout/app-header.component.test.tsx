import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useIsNurse } from '../../../hooks/useIsNurse';
import { AppHeaderComponent } from '../../../components/layout/app-header.component';

/*
 * Mocked rather than a real react-redux Provider — same dual-React-hoisting
 * reason as dashboard.page.test.tsx.
 */
/*
 * The real search box needs a QueryClient and has its own suite
 * (patient-search.component.test.tsx); this file only cares that the header
 * hosts it.
 */
vi.mock('../../../components/layout/patient-search.component', () => ({
  PatientSearchComponent: () => (
    <input placeholder="Search by patient name or ID" />
  ),
}));

vi.mock('../../../hooks/useIsNurse', () => ({ useIsNurse: vi.fn() }));

beforeEach(() => {
  vi.mocked(useIsNurse).mockReturnValue(false);
});

describe('AppHeaderComponent', () => {
  it('greets the user by name', () => {
    render(
      <MemoryRouter>
        <AppHeaderComponent userName="Demo Doctor" />
      </MemoryRouter>
    );

    expect(screen.getByText('Hello, Demo Doctor 👋')).toBeInTheDocument();
  });

  it('shows the patient search for doctors but hides it for nurses', () => {
    const { rerender } = render(
      <MemoryRouter>
        <AppHeaderComponent userName="Demo Doctor" />
      </MemoryRouter>
    );
    expect(
      screen.getByPlaceholderText('Search by patient name or ID')
    ).toBeInTheDocument();

    vi.mocked(useIsNurse).mockReturnValue(true);
    rerender(
      <MemoryRouter>
        <AppHeaderComponent userName="Demo Nurse" />
      </MemoryRouter>
    );
    expect(
      screen.queryByPlaceholderText('Search by patient name or ID')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Hello, Demo Nurse 👋')).toBeInTheDocument();
  });

  it('links the avatar/greeting to the profile page', () => {
    render(
      <MemoryRouter>
        <AppHeaderComponent userName="Demo Doctor" />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('link', { name: /hello, demo doctor/i })
    ).toHaveAttribute('href', '/dashboard/profile');
  });

  it('does not render a sidebar toggle button (the sidebar has its own)', () => {
    render(
      <MemoryRouter>
        <AppHeaderComponent userName="Demo Doctor" />
      </MemoryRouter>
    );

    expect(
      screen.queryByRole('button', { name: 'Toggle sidebar' })
    ).not.toBeInTheDocument();
  });

  it('renders the patient search box', () => {
    render(
      <MemoryRouter>
        <AppHeaderComponent userName="Demo Doctor" />
      </MemoryRouter>
    );

    expect(
      screen.getByPlaceholderText('Search by patient name or ID')
    ).toBeInTheDocument();
  });

  it('updates the search box value as the user types (visual only — no wiring yet)', () => {
    render(
      <MemoryRouter>
        <AppHeaderComponent userName="Demo Doctor" />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(
      'Search by patient name or ID'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Asha' } });

    expect(input.value).toBe('Asha');
  });

  it('falls back to the placeholder avatar when the provided image fails to load', () => {
    // alt="" gives the avatar an empty accessible name, which strips it out
    // of the "img" role entirely (treated as decorative) — queried by its
    // (distinctive) src instead of role for that reason. There are two
    // <img>s in this header (the search icon is the other), so a bare tag
    // selector would grab whichever renders first instead of the avatar.
    const { container } = render(
      <MemoryRouter>
        <AppHeaderComponent userName="Demo Doctor" avatarUrl="broken.jpg" />
      </MemoryRouter>
    );

    const avatar = container.querySelector(
      'img[src="broken.jpg"]'
    ) as HTMLImageElement;
    expect(avatar.src).toContain('broken.jpg');

    // user.svg is small enough that Vite inlines it as a data URI rather
    // than a "user.svg" path — asserting the src actually changed off the
    // broken one is what this test can portably check.
    fireEvent.error(avatar);
    expect(avatar.src).not.toContain('broken.jpg');
  });
});
