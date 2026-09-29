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
}

/**
 * main-container.component.html's `<ul class="admin-nav">` entries — the
 * system-admin-only rows (Ayu/Support/Report/User Creation) and the
 * nurse-vs-doctor profile-route split are left out, since neither role
 * branching nor those admin pages exist in this app yet. Only Dashboard
 * actually routes anywhere so far; My Profile/Change Password/Help are
 * kept as real nav rows (matching the reference UI) but point nowhere
 * until dashboard/profile.page.tsx and friends are migrated.
 */
export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  {
    label: 'Dashboard',
    path: ROUTES.DASHBOARD,
    iconDefault: homeBlue,
    iconActive: homeWhite,
  },
  {
    label: 'My Profile',
    path: `${ROUTES.DASHBOARD}/profile`,
    iconDefault: userBlue,
    iconActive: userWhite,
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
  },
];
