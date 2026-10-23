import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';

interface ModalOverlayComponentProps {
  /**
   * Omit for a dialog that must be answered (e.g. session expired): with no
   * handler, Escape and a click on the backdrop do nothing.
   */
  onClose?: () => void;
  children: ReactNode;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
}

/**
 * The dimmed backdrop every dialog sits on — the part of Angular Material's
 * dialog container that closes it on Escape and on a click outside the
 * panel, and that keeps keyboard focus inside the dialog: focus moves in when
 * it opens, Tab/Shift+Tab cycle within it rather than reaching the page
 * behind, and focus goes back to where it was when it closes. Children
 * render the panel itself (with its own role="dialog", sizing and content).
 */
export function ModalOverlayComponent({
  onClose,
  children,
}: ModalOverlayComponentProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  /*
   * The latest handler lives in a ref so the Escape listener is attached once
   * per dialog, not re-attached on every render of a parent that passes a
   * fresh inline function.
   */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  const dismissible = Boolean(onClose);

  useEffect(() => {
    if (!dismissible) return;
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current?.();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dismissible]);

  useEffect(() => {
    const overlay = overlayRef.current as HTMLDivElement;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    (focusableIn(overlay)[0] ?? overlay).focus();
    return () => previouslyFocused?.focus();
  }, []);

  function trapTab(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return;
    const overlay = event.currentTarget;
    const items = focusableIn(overlay);
    if (!items.length) {
      event.preventDefault();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    const escaped = !overlay.contains(active) || active === overlay;

    if (event.shiftKey && (escaped || active === first)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (escaped || active === last)) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 outline-none"
      onKeyDown={trapTab}
      onMouseDown={event => {
        if (onClose && event.target === event.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}
