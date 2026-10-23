import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('has to be answered when no onClose is given: it does not even listen for Escape, and a backdrop click is harmless', () => {
    const addListener = vi.spyOn(document, 'addEventListener');
    const { container } = render(
      <ModalOverlayComponent>
        <p>panel</p>
      </ModalOverlayComponent>
    );

    expect(addListener).not.toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseDown(container.firstElementChild as HTMLElement);

    expect(screen.getByText('panel')).toBeInTheDocument();
    addListener.mockRestore();
  });

  describe('keyboard focus', () => {
    function renderWithTwoButtons(onClose = vi.fn()) {
      return render(
        <>
          <button type="button">behind</button>
          <ModalOverlayComponent onClose={onClose}>
            <div role="dialog">
              <button type="button">first</button>
              <button type="button">last</button>
            </div>
          </ModalOverlayComponent>
        </>
      );
    }

    it('moves focus into the dialog when it opens', () => {
      renderWithTwoButtons();

      expect(screen.getByRole('button', { name: 'first' })).toHaveFocus();
    });

    it('focuses the overlay itself when the dialog has nothing focusable', () => {
      const { container } = render(
        <ModalOverlayComponent onClose={vi.fn()}>
          <p>just text</p>
        </ModalOverlayComponent>
      );

      expect(container.firstElementChild).toHaveFocus();
    });

    it('hands focus back to what had it before, when it closes', () => {
      const { rerender } = render(<button type="button">opener</button>);
      screen.getByRole('button', { name: 'opener' }).focus();

      rerender(
        <>
          <button type="button">opener</button>
          <ModalOverlayComponent onClose={vi.fn()}>
            <button type="button">inside</button>
          </ModalOverlayComponent>
        </>
      );
      expect(screen.getByRole('button', { name: 'inside' })).toHaveFocus();

      rerender(<button type="button">opener</button>);
      expect(screen.getByRole('button', { name: 'opener' })).toHaveFocus();
    });

    it('keeps Tab inside the dialog, wrapping from the last control to the first', async () => {
      renderWithTwoButtons();
      const user = userEvent.setup();

      await user.tab();
      expect(screen.getByRole('button', { name: 'last' })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'first' })).toHaveFocus();
    });

    it('keeps Shift+Tab inside the dialog, wrapping from the first control to the last', async () => {
      renderWithTwoButtons();
      const user = userEvent.setup();

      await user.tab({ shift: true });

      expect(screen.getByRole('button', { name: 'last' })).toHaveFocus();
    });

    it('pulls focus back in when it had escaped to the page behind', () => {
      const { container } = renderWithTwoButtons();
      screen.getByRole('button', { name: 'behind' }).focus();

      fireEvent.keyDown(
        container.querySelector('[tabindex="-1"]') as HTMLElement,
        {
          key: 'Tab',
        }
      );
      expect(screen.getByRole('button', { name: 'first' })).toHaveFocus();

      screen.getByRole('button', { name: 'behind' }).focus();
      fireEvent.keyDown(
        container.querySelector('[tabindex="-1"]') as HTMLElement,
        {
          key: 'Tab',
          shiftKey: true,
        }
      );
      expect(screen.getByRole('button', { name: 'last' })).toHaveFocus();
    });

    it('lets Tab move normally between controls in the middle', () => {
      const { container } = render(
        <ModalOverlayComponent onClose={vi.fn()}>
          <button type="button">a</button>
          <button type="button">b</button>
          <button type="button">c</button>
        </ModalOverlayComponent>
      );
      screen.getByRole('button', { name: 'b' }).focus();

      const notPrevented = fireEvent.keyDown(
        container.firstElementChild as HTMLElement,
        {
          key: 'Tab',
        }
      );

      expect(notPrevented).toBe(true);
    });

    it('swallows Tab when the dialog has nothing to tab to', () => {
      const { container } = render(
        <ModalOverlayComponent onClose={vi.fn()}>
          <p>just text</p>
        </ModalOverlayComponent>
      );

      const notPrevented = fireEvent.keyDown(
        container.firstElementChild as HTMLElement,
        {
          key: 'Tab',
        }
      );

      expect(notPrevented).toBe(false);
    });

    it('ignores keys other than Tab', () => {
      const { container } = renderWithTwoButtons();

      const notPrevented = fireEvent.keyDown(
        container.querySelector('[tabindex="-1"]') as HTMLElement,
        {
          key: 'a',
        }
      );

      expect(notPrevented).toBe(true);
    });
  });

  it('attaches its Escape listener once even when the parent passes a new onClose every render', () => {
    const addListener = vi.spyOn(document, 'addEventListener');
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <ModalOverlayComponent onClose={first}>
        <p>panel</p>
      </ModalOverlayComponent>
    );
    rerender(
      <ModalOverlayComponent onClose={second}>
        <p>panel</p>
      </ModalOverlayComponent>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    const keydownRegistrations = addListener.mock.calls.filter(
      ([type]) => type === 'keydown'
    );
    expect(keydownRegistrations).toHaveLength(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    addListener.mockRestore();
  });
});
