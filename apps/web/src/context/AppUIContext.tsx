import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface AppUIContextValue {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const AppUIContext = createContext<AppUIContextValue | undefined>(undefined);

/**
 * Cross-cutting UI state (migration guide §5's context/ row — breadcrumb,
 * global modal, sidebar collapse, etc.). The shell itself (navbar/side-menu
 * from §3) isn't built in this pass; this is the seam it plugs into rather
 * than each future component inventing its own sidebar-open boolean.
 */
export function AppUIProvider({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const value = useMemo(
    () => ({
      isSidebarOpen,
      toggleSidebar: () => setSidebarOpen(open => !open),
    }),
    [isSidebarOpen]
  );

  return (
    <AppUIContext.Provider value={value}>{children}</AppUIContext.Provider>
  );
}

export function useAppUIContext(): AppUIContextValue {
  const ctx = useContext(AppUIContext);
  if (!ctx) {
    throw new Error('useAppUIContext must be used within AppUIProvider');
  }
  return ctx;
}
