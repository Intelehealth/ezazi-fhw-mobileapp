import type { ReactNode } from 'react';

type TooltipPosition = 'below' | 'below-end' | 'right' | 'left';

const POSITION_CLASS: Record<TooltipPosition, string> = {
  below: 'top-full left-1/2 mt-2 -translate-x-1/2',
  /* Under the element, flush with its right edge — for controls at the right of the page. */
  'below-end': 'top-full right-0 mt-2',
  right: 'top-1/2 left-full ml-2 -translate-y-1/2',
  left: 'top-1/2 right-full mr-2 -translate-y-1/2',
};

/**
 * The tooltip on a control whose screen or dialog has not been ported yet —
 * shown on the disabled control instead of letting a click do nothing.
 */
export const COMING_SOON = 'Coming soon';

interface TooltipComponentProps {
  /** Empty renders the children alone, like matTooltip's `''`. */
  label: string;
  position?: TooltipPosition;
  children: ReactNode;
}

/**
 * Angular Material's `matTooltip` bubble, shown on hover/focus of the
 * wrapped element — the same styling case-section.component.tsx inlines for
 * its help icon. Wraps rather than attaches so it still shows over disabled
 * buttons, which never get hover events of their own.
 */
export function TooltipComponent({
  label,
  position = 'below',
  children,
}: TooltipComponentProps) {
  if (!label) return <>{children}</>;

  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        /*
         * display:none until shown, not just transparent: an invisible box
         * still counts toward its scroll container's width, so a tooltip at
         * the page's edge would add a horizontal scrollbar.
         */
        className={`pointer-events-none absolute z-30 hidden rounded-md bg-[#7F7B92] px-2 py-1 text-xs font-normal whitespace-nowrap text-white group-focus-within/tooltip:block group-hover/tooltip:block ${POSITION_CLASS[position]}`}
      >
        {label}
      </span>
    </span>
  );
}
