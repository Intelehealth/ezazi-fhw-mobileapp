import type { ReactNode } from 'react';

type StatChipTone = 'red' | 'blue' | 'outline';

interface StatChipComponentProps {
  icon: ReactNode;
  count: number;
  label: string;
  tone: StatChipTone;
}

/** Background/label colors per tone, lifted from dashboard.component.scss's .chip-item-* rules. */
const TONE_CLASSES: Record<StatChipTone, string> = {
  red: 'bg-[#FFE8E8]',
  blue: 'bg-[#EFE8FF]',
  outline: 'bg-[#c9beff]',
};

const TONE_LABEL_CLASSES: Record<StatChipTone, string> = {
  red: 'text-[#ED1A56]',
  blue: 'text-[#2E1E91]',
  outline: 'text-[#2E1E91]',
};

/**
 * The priority/in-progress/completed count card from dashboard.component.html's
 * `.chip-item` rows — one instance per tone (red/blue/outline).
 */
export function StatChipComponent({
  icon,
  count,
  label,
  tone,
}: StatChipComponentProps) {
  return (
    <div
      className={`flex h-[86px] w-full items-center rounded-xl p-4 ${TONE_CLASSES[tone]}`}
    >
      <div className="w-11 shrink-0">{icon}</div>
      <div className="p-4">
        <h6 className="mt-2 mb-2 text-xl font-bold text-black">{count}</h6>
        <span className={`text-base font-bold ${TONE_LABEL_CLASSES[tone]}`}>
          {label}
        </span>
      </div>
    </div>
  );
}
