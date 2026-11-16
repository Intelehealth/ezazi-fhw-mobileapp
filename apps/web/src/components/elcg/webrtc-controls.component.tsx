import videoSquareIcon from '../../assets/svgs/video-square.svg';
import chatSquareIcon from '../../assets/svgs/chat-square.svg';

interface WebrtcControlsComponentProps {
  onStartCall?: () => void;
  onStartChat?: () => void;
}

/**
 * The video-call and chat buttons pinned to the bottom-right of the ELCG
 * screen (partogram.component.html's `.webrtc-controls`).
 */
export function WebrtcControlsComponent({
  onStartCall,
  onStartChat,
}: WebrtcControlsComponentProps) {
  return (
    <div className="fixed right-5 bottom-5 z-[999] flex flex-col items-center gap-2.5">
      <button
        type="button"
        aria-label="Start video call"
        onClick={onStartCall}
        className="cursor-pointer rounded-lg shadow"
      >
        <img src={videoSquareIcon} alt="" className="rounded-lg" />
      </button>
      <button
        type="button"
        aria-label="Start chat"
        onClick={onStartChat}
        className="cursor-pointer rounded-lg shadow"
      >
        <img src={chatSquareIcon} alt="" className="rounded-lg" />
      </button>
    </div>
  );
}
