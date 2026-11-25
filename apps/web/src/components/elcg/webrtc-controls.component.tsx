import videoSquareIcon from '../../assets/svgs/video-square.svg';
import chatSquareIcon from '../../assets/svgs/chat-square.svg';
import { COMING_SOON, TooltipComponent } from '../common/tooltip.component';

const CONTROL_CLASS =
  'cursor-pointer rounded-lg shadow disabled:cursor-not-allowed disabled:opacity-50';

interface WebrtcControlsComponentProps {
  onStartCall?: () => void;
  onStartChat?: () => void;
}

/**
 * The video-call and chat buttons pinned to the bottom-right of the ELCG
 * screen (partogram.component.html's `.webrtc-controls`). Each is disabled,
 * marked "Coming soon", until it is given a handler.
 */
export function WebrtcControlsComponent({
  onStartCall,
  onStartChat,
}: WebrtcControlsComponentProps) {
  return (
    <div className="fixed right-5 bottom-5 z-[999] flex flex-col items-center gap-2.5">
      <TooltipComponent label={onStartCall ? '' : COMING_SOON} position="left">
        <button
          type="button"
          aria-label="Start video call"
          disabled={!onStartCall}
          onClick={onStartCall}
          className={CONTROL_CLASS}
        >
          <img src={videoSquareIcon} alt="" className="rounded-lg" />
        </button>
      </TooltipComponent>
      <TooltipComponent label={onStartChat ? '' : COMING_SOON} position="left">
        <button
          type="button"
          aria-label="Start chat"
          disabled={!onStartChat}
          onClick={onStartChat}
          className={CONTROL_CLASS}
        >
          <img src={chatSquareIcon} alt="" className="rounded-lg" />
        </button>
      </TooltipComponent>
    </div>
  );
}
