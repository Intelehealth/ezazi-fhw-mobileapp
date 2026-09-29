import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppHeaderComponent } from '../../../components/layout/app-header.component';

describe('AppHeaderComponent', () => {
  it('greets the user by name', () => {
    render(
      <MemoryRouter>
        <AppHeaderComponent userName="Demo Doctor" />
      </MemoryRouter>
    );

    expect(screen.getByText('Hello, Demo Doctor 👋')).toBeInTheDocument();
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
