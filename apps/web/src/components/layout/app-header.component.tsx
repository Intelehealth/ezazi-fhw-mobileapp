import { useState } from 'react';
import { Link } from 'react-router-dom';
import searchIcon from '../../assets/svgs/search-icon.svg';
import userIcon from '../../assets/svgs/user.svg';
import { ROUTES } from '../../routes/paths';

interface AppHeaderComponentProps {
  userName: string;
  avatarUrl?: string;
}

/**
 * Ports main-container.component.html's sticky top bar — "Search by
 * patient name or ID" box, notification bell, and the "Hello, {name} 👋"
 * greeting. The search box and bell are visual only: the Angular version's
 * searchForm/notification-menu wiring depends on VisitService and a
 * notification service neither of which exist in this app yet (this pass
 * is UI-only — see dashboard.component.tsx's own note).
 */
export function AppHeaderComponent({
  userName,
  avatarUrl,
}: AppHeaderComponentProps) {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    // px-5 matches dashboard-layout.component.tsx's content wrapper
    // (`p-5`) so the search box's left edge lines up with the Priority
    // cases chip below it, instead of the p-4 this had before leaving it
    // 4px further left than the content underneath.
    <nav className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-white px-10 py-4">
      <div className="flex h-[52px] w-[25vw] items-center rounded-lg border-2 border-[rgba(178,175,190,0.2)] bg-[#FAF9FF] px-4">
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
        {/* Ports main-container.component.html's greeting-links-to-profile
            behavior — the avatar + "Hello, {name}" both route to My Profile,
            same destination as the sidebar's own profile row. */}
        <Link to={ROUTES.DASHBOARD_PROFILE} className="flex items-center gap-3">
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
        </Link>
      </div>
    </nav>
  );
}
