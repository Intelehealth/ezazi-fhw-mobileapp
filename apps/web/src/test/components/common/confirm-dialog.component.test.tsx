import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialogComponent } from '../../../components/common/confirm-dialog.component';

function renderDialog(onClose = vi.fn()) {
  render(
    <ConfirmDialogComponent
      message="Are you sure you want to logout?"
      cancelText="No"
      confirmText="Yes"
      onClose={onClose}
    />
  );
  return onClose;
}

describe('ConfirmDialogComponent', () => {
  it('shows the Confirm title, the message and the two buttons with the given labels', () => {
    renderDialog();

    expect(screen.getByRole('dialog', { name: 'Confirm' })).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to logout?')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument();
  });

  it('reports true only for the confirm button', () => {
    const onClose = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it.each([
    [
      'the cancel button',
      () => fireEvent.click(screen.getByRole('button', { name: 'No' })),
    ],
    [
      'the Close button',
      () => fireEvent.click(screen.getByRole('button', { name: 'Close' })),
    ],
    ['Escape', () => fireEvent.keyDown(document, { key: 'Escape' })],
    [
      'a click on the backdrop',
      () =>
        fireEvent.mouseDown(
          screen.getByRole('dialog').parentElement as HTMLElement
        ),
    ],
  ])('reports false when dismissed with %s', (_how, dismiss) => {
    const onClose = renderDialog();

    dismiss();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith(false);
  });
});
