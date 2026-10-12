export interface TabSwitcherTab {
  id: string;
  label: string;
}

interface TabSwitcherComponentProps {
  tabs: TabSwitcherTab[];
  active: string;
  onChange: (id: string) => void;
}

/**
 * The pill tab bar shared by forgot-username and verification-method
 * (identical `ul.nav-tabs` markup/.scss in both Angular components) — see
 * contact-tabs.component.tsx for the phone/email fields it switches between.
 */
export function TabSwitcherComponent({
  tabs,
  active,
  onChange,
}: TabSwitcherComponentProps) {
  return (
    <div className="flex rounded-lg bg-[#EFE8FF] p-2">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex h-12 flex-1 cursor-pointer items-center justify-center rounded-lg text-base font-bold text-[#2E1E91] ${
            active === tab.id ? 'bg-white shadow-[0px_2px_6px_rgba(27,22,58,0.08)]' : ''
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
