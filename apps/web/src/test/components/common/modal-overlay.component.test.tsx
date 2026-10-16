import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ModalOverlayComponent } from '../../../components/common/modal-overlay.component';

describe('ModalOverlayComponent', () => {
  it('renders its children', () => {
    render(
      <ModalOverlayComponent onClose={vi.fn()}>
        <p>panel</p>
      </ModalOverlayComponent>
    );

    expect(screen.getByText('panel')).toBeInTheDocument();
  });

  it('closes on Escape but not on other keys', () => {
    const onClose = vi.fn();
    render(
      <ModalOverlayComponent onClose={onClose}>
        <p>panel</p>
      </ModalOverlayComponent>
    );

    fireEvent.keyDown(document, { key: 'a' });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on a click on the backdrop, but not on a click inside the panel', () => {
    const onClose = vi.fn();
    const { container } = render(
      <ModalOverlayComponent onClose={onClose}>
        <p>panel</p>
      </ModalOverlayComponent>
    );

    fireEvent.mouseDown(screen.getByText('panel'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(container.firstElementChild as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stops listening for Escape once it unmounts', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <ModalOverlayComponent onClose={onClose}>
        <p>panel</p>
      </ModalOverlayComponent>
    );

    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });
});
