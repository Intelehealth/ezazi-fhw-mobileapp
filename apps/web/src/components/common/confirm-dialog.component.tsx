import closeIcon from '../../assets/svgs/close-x.svg';
import warningIcon from '../../assets/svgs/warning-circle.svg';
import { ModalOverlayComponent } from './modal-overlay.component';

interface ConfirmDialogComponentProps {
  message: string;
  cancelText: string;
  confirmText: string;
  /** true when the confirm button was pressed; false for the cancel button, the X, Escape or a backdrop click. */
  onClose: (confirmed: boolean) => void;
}

/**
 * Ports confirm-dialog.component.html (intelehealth-doctor-webapp), opened
 * through CoreService.openConfirmationDialog: a "Confirm" title under an
 * 80px warning icon, the message, and a cancel / confirm button pair, with
 * an X in the corner. Closing it any way other than the confirm button
 * counts as "no", like the Material dialog's falsy result.
 */
export function ConfirmDialogComponent({
  message,
  cancelText,
  confirmText,
  onClose,
}: ConfirmDialogComponentProps) {
  return (
    <ModalOverlayComponent onClose={() => onClose(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative flex w-[490px] max-w-[90%] flex-col items-center justify-center rounded-xl bg-white p-6"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => onClose(false)}
          className="absolute top-6 right-6 cursor-pointer border-none bg-transparent"
        >
          <img src={closeIcon} alt="" />
        </button>

        <div className="mt-4 flex flex-col items-center justify-center">
          <img src={warningIcon} alt="" width={80} height={80} />
          <h6
            id="confirm-dialog-title"
            className="mt-3 text-center text-2xl leading-[150%] font-bold text-[#1B163A]"
          >
            Confirm
          </h6>
          <p className="mt-2 text-center text-lg leading-[150%] text-[#7F7B92]">
            {message}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-center">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="mr-3 min-h-12 min-w-[119px] cursor-pointer rounded-lg border border-[#EFE8FF] bg-white px-6 py-2 text-lg leading-[150%] font-bold text-[#2E1E91]"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => onClose(true)}
            className="min-h-12 min-w-[119px] cursor-pointer rounded-lg border border-[#2E1E91] bg-[#2E1E91] px-6 py-2 text-lg leading-[150%] font-bold text-white"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </ModalOverlayComponent>
  );
}
