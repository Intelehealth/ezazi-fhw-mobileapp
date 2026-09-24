import { Link, useLocation } from 'react-router-dom';
import { clientConfig } from '../../config/clients';
import { SIDEBAR_NAV_ITEMS } from '../../routes/nav-items';
import ezaziSmallLogo from '../../assets/ezazi/ezazi-sm-logo.svg';
import powerBlue from '../../assets/svgs/power-blue.svg';
import powerWhite from '../../assets/svgs/power-white.svg';

interface SidebarNavComponentProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onLogout: () => void;
}

/**
 * Ports main-container.component.html's `<mat-drawer>` sidebar — pink
 * `.menu-items-wrapper` panel, nav rows that swap a blue icon for a white
 * one on hover/active (`.i1`/`.i2` + `.nav-item-link.active` in the Angular
 * scss), and Log-out pinned to the bottom via `.nav-item:last-child`.
 */
export function SidebarNavComponent({
  collapsed,
  onToggleCollapsed,
  onLogout,
}: SidebarNavComponentProps) {
  const location = useLocation();

  return (
    <div
      className={`relative flex h-full flex-col rounded-xl bg-[#FFE9EF] ${
        collapsed ? 'w-[78px]' : 'w-[278px]'
      }`}
    >
      <div className="relative flex min-h-[121px] items-center justify-center p-4">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          // z-20: this pokes out of the sidebar into the header's column
          // (see dashboard-layout.component.tsx), and app-header.component.tsx's
          // `sticky ... z-10` nav was painting its opaque bg-white right over
          // it — invisible even though it was rendering and clickable.
          className="absolute top-1/2 -right-[17px] z-20 flex h-[34px] w-[34px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white shadow-[0_0_16px_rgba(46,30,145,0.32)]"
        >
          {collapsed ? '›' : '‹'}
        </button>
        {collapsed ? (
          <img src={ezaziSmallLogo} alt="" className="w-4/5" />
        ) : (
          <img
            src={clientConfig.assets.logo}
            alt={clientConfig.displayName}
            className="h-[60px]"
          />
        )}
      </div>

      <ul className="flex h-full flex-col overflow-auto px-4 pb-5">
        {SIDEBAR_NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <li key={item.path} className="mb-1 h-[52px] w-full">
              <Link
                to={item.path}
                className={`group flex h-full w-full cursor-pointer items-center rounded-lg ${
                  collapsed ? 'justify-center px-2' : 'px-5'
                } ${isActive ? 'bg-[#4B39B7]' : 'hover:bg-[#4B39B7]'}`}
              >
                <img
                  src={item.iconDefault}
                  alt=""
                  className={isActive ? 'hidden' : 'block group-hover:hidden'}
                />
                <img
                  src={item.iconActive}
                  alt=""
                  className={isActive ? 'block' : 'hidden group-hover:block'}
                />
                {!collapsed && (
                  <span
                    className={`px-5 text-base font-bold ${
                      isActive
                        ? 'text-white'
                        : 'text-[#2E1E91] group-hover:text-white'
                    }`}
                  >
                    {item.label}
                  </span>
                )}
              </Link>
            </li>
          );
        })}

        <li className="mt-auto h-[52px] w-full border-t-2 border-[#EFE8FF]/48 pt-3">
          <button
            type="button"
            onClick={onLogout}
            className={`group flex h-full w-full cursor-pointer items-center rounded-lg hover:bg-[#4B39B7] ${
              collapsed ? 'justify-center px-2' : 'px-5'
            }`}
          >
            <img src={powerBlue} alt="" className="block group-hover:hidden" />
            <img src={powerWhite} alt="" className="hidden group-hover:block" />
            {!collapsed && (
              <span className="px-5 text-base font-bold text-[#2E1E91] group-hover:text-white">
                Log-out
              </span>
            )}
          </button>
        </li>
      </ul>
    </div>
  );
}
