import { TooltipComponent } from '../common/tooltip.component';
import whatsappIcon from '../../assets/svgs/whatsapp-green.svg';
import printIcon from '../../assets/svgs/print-white.svg';

/** partogram.component.scss's `.blue-btn`. */
const BLUE_BUTTON_CLASS =
  'cursor-pointer rounded-lg bg-[#2E1E91] p-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50';

/** partogram.component.scss's `.icon-action-btn`. */
const ICON_BUTTON_CLASS =
  'flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-[#2E1E91] transition-colors hover:bg-[#231672]';

interface LcgToolbarComponentProps {
  pastVisitsCount: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onViewPastDetails?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onShareOnWhatsApp: () => void;
  onPrint?: () => void;
}

/**
 * The action row above the guide in partogram.component.html: "View Past
 * Details" on the left; zoom, WhatsApp share and print on the right.
 */
export function LcgToolbarComponent({
  pastVisitsCount,
  canZoomIn,
  canZoomOut,
  onViewPastDetails,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onShareOnWhatsApp,
  onPrint,
}: LcgToolbarComponentProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2">
      <TooltipComponent label={pastVisitsCount ? '' : 'No past visits'}>
        <button
          type="button"
          disabled={!pastVisitsCount}
          onClick={onViewPastDetails}
          className={BLUE_BUTTON_CLASS}
        >
          View Past Details
        </button>
      </TooltipComponent>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!canZoomIn}
          onClick={onZoomIn}
          className={BLUE_BUTTON_CLASS}
        >
          Zoom In [+]
        </button>
        <button
          type="button"
          disabled={!canZoomOut}
          onClick={onZoomOut}
          className={BLUE_BUTTON_CLASS}
        >
          Zoom Out [-]
        </button>
        <button
          type="button"
          onClick={onZoomReset}
          className={BLUE_BUTTON_CLASS}
        >
          Reset
        </button>
        <TooltipComponent label="Share on WhatsApp">
          <button
            type="button"
            aria-label="Share on WhatsApp"
            onClick={onShareOnWhatsApp}
            className={ICON_BUTTON_CLASS}
          >
            <img src={whatsappIcon} alt="" width={24} height={24} />
          </button>
        </TooltipComponent>
        <TooltipComponent label="Print">
          <button
            type="button"
            aria-label="Print"
            onClick={onPrint}
            className={ICON_BUTTON_CLASS}
          >
            <img src={printIcon} alt="" width={22} height={22} />
          </button>
        </TooltipComponent>
      </div>
    </div>
  );
}
