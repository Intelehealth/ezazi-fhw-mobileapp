import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../../../components/common/button.component';

describe('Button', () => {
  it('renders its children and fires onClick when enabled', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Log out</Button>);

    const button = screen.getByRole('button', { name: 'Log out' });
    await userEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows a loading indicator instead of its children and disables itself while isLoading', () => {
    render(<Button isLoading>Log out</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('…');
    expect(button).not.toHaveTextContent('Log out');
  });

  it('stays disabled when explicitly passed disabled, independent of isLoading', () => {
    render(<Button disabled>Log out</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('merges a caller className onto its own base classes', () => {
    render(<Button className="w-auto px-6">Go to home</Button>);
    expect(screen.getByRole('button').className).toContain('w-auto px-6');
  });
});
