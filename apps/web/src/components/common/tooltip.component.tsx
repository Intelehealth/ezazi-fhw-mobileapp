import type { ReactNode } from 'react';

type TooltipPosition = 'below' | 'right';

const POSITION_CLASS: Record<TooltipPosition, string> = {
  below: 'top-full left-1/2 mt-2 -translate-x-1/2',
  right: 'top-1/2 left-full ml-2 -translate-y-1/2',
};

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
        className={`pointer-events-none absolute z-30 rounded-md bg-[#7F7B92] px-2 py-1 text-xs font-normal whitespace-nowrap text-white opacity-0 transition-opacity group-focus-within/tooltip:opacity-100 group-hover/tooltip:opacity-100 ${POSITION_CLASS[position]}`}
      >
        {label}
      </span>
    </span>
  );
}
