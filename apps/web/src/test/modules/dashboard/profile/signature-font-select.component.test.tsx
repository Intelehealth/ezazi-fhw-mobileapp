import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SignatureFontSelect } from '../../../../modules/dashboard/profile/signature-font-select.component';

describe('SignatureFontSelect', () => {
  it('shows the placeholder text when previewText is blank, closed by default', () => {
    render(
      <SignatureFontSelect value="" onChange={vi.fn()} previewText="  " />
    );

    const trigger = screen.getByRole('button', { name: /select signature/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens the listbox, previews every font with the typed signature text, and marks the selected one', async () => {
    render(
      <SignatureFontSelect
        value="arty"
        onChange={vi.fn()}
        previewText="Demo Doctor"
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Demo Doctor' }));

    const listbox = screen.getByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
    expect(within(listbox).getAllByText('Demo Doctor')).toHaveLength(4);
  });

  it('selects a font from the listbox and closes it', async () => {
    const onChange = vi.fn();
    render(
      <SignatureFontSelect
        value="arty"
        onChange={onChange}
        previewText="Demo"
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Demo' }));
    const listbox = screen.getByRole('listbox');
    const secondOption = within(listbox).getAllByRole('button')[1];
    await userEvent.click(secondOption);

    expect(onChange).toHaveBeenCalledWith('asem');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes the listbox when the backdrop is clicked, without selecting anything', async () => {
    const onChange = vi.fn();
    render(
      <SignatureFontSelect value="" onChange={onChange} previewText="Demo" />
    );

    const trigger = screen.getByRole('button', { name: /demo/i });
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(
      screen.getByRole('button', { name: '', hidden: true })
    );

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows a validation error message when given one', () => {
    render(
      <SignatureFontSelect
        value=""
        onChange={vi.fn()}
        previewText=""
        error="Select Signature"
      />
    );

    expect(
      screen.getByText('Select Signature', { selector: 'p' })
    ).toBeInTheDocument();
  });
});
