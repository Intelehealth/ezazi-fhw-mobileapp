import { useState } from 'react';
import searchIcon from '../../assets/svgs/search-icon.svg';
import userIcon from '../../assets/svgs/user.svg';

interface AppHeaderComponentProps {
  userName: string;
  avatarUrl?: string;
  onToggleSidebar: () => void;
}

/**
 * Ports main-container.component.html's sticky top bar — hamburger toggle,
 * "Search by patient name or ID" box, notification bell, and the
 * "Hello, {name} 👋" greeting. The search box and bell are visual only: the
 * Angular version's searchForm/notification-menu wiring depends on
 * VisitService and a notification service neither of which exist in this
 * app yet (this pass is UI-only — see dashboard.component.tsx's own note).
 */
export function AppHeaderComponent({
  userName,
  avatarUrl,
  onToggleSidebar,
}: AppHeaderComponentProps) {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <nav className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-white p-4">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        className="shrink-0 cursor-pointer text-2xl text-[#2E1E91]"
      >
        ☰
      </button>

      <div className="flex h-[52px] min-w-[400px] max-w-[60vw] flex-1 items-center rounded-lg border-2 border-[rgba(178,175,190,0.2)] bg-[#FAF9FF] px-4">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search by patient name or ID"
          aria-label="Search by patient name or ID"
          className="w-full border-none bg-transparent text-base outline-none"
        />
        <img src={searchIcon} alt="" width={20} height={20} />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl bg-[#D7D4EA] text-[#2E1E91]"
        >
          🔔
        </button>
        <div className="flex items-center gap-3">
          <img
            src={avatarUrl ?? userIcon}
            onError={e => {
              e.currentTarget.src = userIcon;
            }}
            alt=""
            className="h-11 w-11 rounded-full object-cover"
          />
          <h6 className="mb-0 text-base font-bold whitespace-nowrap">
            Hello, {userName} 👋
          </h6>
        </div>
      </div>
    </nav>
  );
}
