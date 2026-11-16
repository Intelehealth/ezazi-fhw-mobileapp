import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react';

interface DragStart {
  x: number;
  y: number;
  panX: number;
  scrollTop: number;
  /** What scrolls the page vertically — the dashboard shell's content pane. */
  pageScroller: Element;
  /** Touch drags pan sideways only; vertical swipes scroll the page natively. */
  isTouch: boolean;
}

/** The frame's width inside its padding — what the guide is laid out to fit. */
function innerWidth(frame: HTMLElement): number {
  const { paddingLeft, paddingRight } = getComputedStyle(frame);
  return (
    frame.clientWidth -
    (parseFloat(paddingLeft) || 0) -
    (parseFloat(paddingRight) || 0)
  );
}

/** The nearest ancestor that scrolls vertically, else the document itself. */
function findPageScroller(element: HTMLElement): Element {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    const scrolls = overflowY === 'auto' || overflowY === 'scroll';
    if (scrolls && node.scrollHeight > node.clientHeight) return node;
  }
  return document.scrollingElement ?? document.documentElement;
}

interface LcgViewportComponentProps {
  /** Scale factor — 1 is actual size. */
  zoom: number;
  children: ReactNode;
}

/**
 * The bordered frame the guide is panned and zoomed inside — the
 * `<pan-zoom>` of partogram.component.html. The frame takes the guide's full
 * height, leaving vertical scrolling to the page.
 *
 * Dragging pans the guide sideways freely, whether or not it overflows the
 * frame (pan-zoom's `keepInBounds: false`), and scrolls the page up and down.
 * Each zoom change re-centres it horizontally, like the Angular zoomIn() /
 * zoomOut()'s centerX(); remount the viewport (a new `key`) to reset the pan.
 *
 * As in pan-zoom, the guide is laid out to the frame's width — so a narrow
 * frame squeezes it down to its narrowest, wrapping its labels — and zooming
 * only scales that layout. Scaling uses CSS `zoom` rather than a transform so
 * the frame's height follows it. Drags that start on a button are left alone
 * so its click still lands.
 */
export function LcgViewportComponent({
  zoom,
  children,
}: LcgViewportComponentProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<DragStart | null>(null);
  const appliedZoom = useRef(zoom);
  const [panX, setPanX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  /* Null until measured: the guide then takes its natural width. */
  const [layoutWidth, setLayoutWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    setLayoutWidth(innerWidth(frame));
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() =>
      setLayoutWidth(innerWidth(frame))
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (appliedZoom.current === zoom) return;
    appliedZoom.current = zoom;
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content) return;
    /* Centre within the side padding, which keeps the guide off the frame's border. */
    setPanX((innerWidth(frame) - content.getBoundingClientRect().width) / 2);
  }, [zoom]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const frame = frameRef.current;
    const target = event.target as HTMLElement;
    if (!frame || event.button !== 0) return;
    if (target.closest('button')) return;

    const pageScroller = findPageScroller(frame);
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      panX,
      scrollTop: pageScroller.scrollTop,
      pageScroller,
      isTouch: event.pointerType === 'touch',
    };
    /* Stops the press from starting a text selection instead of a drag. */
    event.preventDefault();
    frame.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    if (!start) return;
    setPanX(start.panX + (event.clientX - start.x));
    if (!start.isTouch) {
      start.pageScroller.scrollTop =
        start.scrollTop - (event.clientY - start.y);
    }
  }

  function handlePointerUp() {
    dragStart.current = null;
    setIsDragging(false);
  }

  return (
    <div
      ref={frameRef}
      data-testid="lcg-viewport"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      /* No top padding: the guide's top border sits on the frame's top line, as in pan-zoom. */
      className={`touch-pan-y overflow-hidden border border-black px-4 pb-4 ${
        isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
      }`}
    >
      <div
        data-testid="lcg-pan"
        className="w-max"
        style={{ transform: `translateX(${panX}px)` }}
      >
        <div
          ref={contentRef}
          className={`flex ${layoutWidth ? 'max-w-max' : 'w-max'}`}
          style={{ zoom, width: layoutWidth || undefined }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
