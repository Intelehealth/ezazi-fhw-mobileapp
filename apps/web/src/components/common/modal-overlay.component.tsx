import { useEffect, type ReactNode } from 'react';

interface ModalOverlayComponentProps {
  onClose: () => void;
  children: ReactNode;
}

/**
 * The dimmed backdrop every dialog sits on — the part of Angular Material's
 * dialog container that closes it on Escape and on a click outside the
 * panel. Children render the panel itself (with its own role="dialog",
 * sizing and content).
 */
export function ModalOverlayComponent({
  onClose,
  children,
}: ModalOverlayComponentProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}
