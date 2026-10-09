import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NotFoundPage from '../../../pages/not-found/not-found.page';

describe('NotFoundPage', () => {
  it('renders the 404 heading, subheading, and body copy', () => {
    render(<NotFoundPage />);
    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
    expect(
      screen.getByText('Ooops, page not found')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Sorry, but the requested page is not found.')
    ).toBeInTheDocument();
  });
});
