import { useState, type ReactNode } from 'react';
import { AppHeaderComponent } from './app-header.component';
import { SidebarNavComponent } from './sidebar-nav.component';

interface DashboardLayoutComponentProps {
  userName: string;
  avatarUrl?: string;
  onLogout: () => void;
  children: ReactNode;
}

/**
 * The authenticated app shell — main-container.component.html's
 * `<mat-drawer-container>` — sidebar + sticky header wrapping the routed
 * page. Only dashboard.page.tsx consumes this so far; move it up to wrap
 * every ROUTES.DASHBOARD* route once profile/change-password get their own
 * pages, matching how the Angular version wraps its whole router-outlet.
 */
export function DashboardLayoutComponent({
  userName,
  avatarUrl,
  onLogout,
  children,
}: DashboardLayoutComponentProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full bg-white p-2">
      <SidebarNavComponent
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed(prev => !prev)}
        onLogout={onLogout}
      />
      <div className="flex-1 overflow-y-auto">
        <AppHeaderComponent
          userName={userName}
          avatarUrl={avatarUrl}
          onToggleSidebar={() => setCollapsed(prev => !prev)}
        />
        <div className="p-5 pb-24">{children}</div>
      </div>
    </div>
  );
}
