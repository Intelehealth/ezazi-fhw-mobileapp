import type { ReactNode } from 'react';

/** styles.scss's `.intel-card`: white, rounded, with a soft shadow. */
export const INTEL_CARD_CLASS =
  'rounded-xl bg-white shadow-[0px_4px_24px_rgba(31,28,58,0.08)]';

interface LcgCardComponentProps {
  title: string;
  /** Shown at the right end of the header. */
  actions?: ReactNode;
  id?: string;
  children: ReactNode;
}

/**
 * A titled `.intel-card` as the ELCG screen's lower sections use it — a
 * `.card-header` (18px bold title, 1px #EFE8FF rule inset 24px from each
 * side) over a 24px-padded `.card-body`, 48px below whatever precedes it.
 */
export function LcgCardComponent({
  title,
  actions,
  id,
  children,
}: LcgCardComponentProps) {
  return (
    <section id={id} className={`mt-12 ${INTEL_CARD_CLASS}`}>
      <div className="relative flex flex-wrap items-center justify-between p-6 text-lg leading-[150%] font-bold text-[#1B163A] after:absolute after:right-6 after:bottom-0 after:left-6 after:h-px after:bg-[#EFE8FF]">
        <h6 className="m-0 text-lg leading-[150%] font-bold">{title}</h6>
        {actions}
      </div>
      <div className="rounded-b-xl bg-white p-6">{children}</div>
    </section>
  );
}
