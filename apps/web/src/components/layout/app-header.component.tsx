import { Link } from 'react-router-dom';
import userIcon from '../../assets/svgs/user.svg';
import { useIsNurse } from '../../hooks/useIsNurse';
import { ROUTES } from '../../routes/paths';
import { PatientSearchComponent } from './patient-search.component';

interface AppHeaderComponentProps {
  userName: string;
  avatarUrl?: string;
}

/**
 * Ports main-container.component.html's sticky top bar — "Search by
 * patient name or ID" box, notification bell, and the "Hello, {name} 👋"
 * greeting. The search box is live (see patient-search.component.tsx); the
 * bell is visual only: the Angular version's notification-menu wiring
 * depends on a notification service that doesn't exist in this app yet.
 */
export function AppHeaderComponent({
  userName,
  avatarUrl,
}: AppHeaderComponentProps) {
  const isNurse = useIsNurse();

  return (
    // px-5 matches dashboard-layout.component.tsx's content wrapper
    // (`p-5`) so the search box's left edge lines up with the Priority
    // cases chip below it, instead of the p-4 this had before leaving it
    // 4px further left than the content underneath.
    <nav className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-white px-10 py-4">
      {/* Nurses don't get the global patient search (the Angular header only
          renders it on the doctor Dashboard page). */}
      {!isNurse && <PatientSearchComponent />}

      <div className="ml-auto flex shrink-0 items-center gap-3">
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
