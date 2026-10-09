import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToastContent } from '../../components/toast';

describe('ToastContent', () => {
  it('renders title and description when provided', () => {
    render(<ToastContent title="Hello" description="World" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('World')).toBeInTheDocument();
  });

  it('renders title and omits the description element when not provided', () => {
    const { container } = render(<ToastContent title="Only Title" />);
    expect(screen.getByText('Only Title')).toBeInTheDocument();
    expect(container.querySelector('span')).toBeNull();
  });
});
