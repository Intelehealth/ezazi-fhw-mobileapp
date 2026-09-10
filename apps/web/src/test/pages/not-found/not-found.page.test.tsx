import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NotFoundPage from '../../../pages/not-found/not-found.page';

describe('NotFoundPage', () => {
  it('renders a not-found message', () => {
    render(<NotFoundPage />);
    expect(screen.getByText('Page not found.')).toBeInTheDocument();
  });
});
