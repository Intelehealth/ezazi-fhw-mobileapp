import homeBlue from '../assets/svgs/home-blue.svg';
import homeWhite from '../assets/svgs/home-white.svg';
import userBlue from '../assets/svgs/user-blue.svg';
import userWhite from '../assets/svgs/user-white.svg';
import lockBlue from '../assets/svgs/lock-blue.svg';
import lockWhite from '../assets/svgs/lock-white.svg';
import infoBlue from '../assets/svgs/info-blue.svg';
import infoWhite from '../assets/svgs/info-white.svg';
import { ROUTES } from './paths';

export interface SidebarNavItem {
  label: string;
  path: string;
  iconDefault: string;
  iconActive: string;
  /** Restricts the row to one role, like the Angular sidebar's `*ngxPermissionsOnly/Except` — omitted means everyone. */
  role?: 'doctor' | 'nurse';
}

/**
 * main-container.component.html's `<ul class="admin-nav">` entries — the
 * system-admin-only rows (Ayu/Support/Report/User Creation) are left out,
 * since those admin pages don't exist in this app yet. Like the Angular
 * sidebar, nurses (see `role`) don't get Dashboard or Help and have their own
 * My Profile row pointing at /dashboard/hw-profile. Dashboard and the profile
 * rows route to real pages; Change Password/Help are kept as real nav
 * rows (matching the reference UI) but point nowhere until their own
 * pages are migrated.
 */
export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  {
    label: 'Dashboard',
    path: ROUTES.DASHBOARD,
    iconDefault: homeBlue,
    iconActive: homeWhite,
    role: 'doctor',
  },
  {
    label: 'My Profile',
    path: ROUTES.DASHBOARD_PROFILE,
    iconDefault: userBlue,
    iconActive: userWhite,
    role: 'doctor',
  },
  {
    label: 'My Profile',
    path: ROUTES.DASHBOARD_HW_PROFILE,
    iconDefault: userBlue,
    iconActive: userWhite,
    role: 'nurse',
  },
  {
    label: 'Change Password',
    path: `${ROUTES.DASHBOARD}/change-password`,
    iconDefault: lockBlue,
    iconActive: lockWhite,
  },
  {
    label: 'Help',
    path: `${ROUTES.DASHBOARD}/help`,
    iconDefault: infoBlue,
    iconActive: infoWhite,
    role: 'doctor',
  },
];
