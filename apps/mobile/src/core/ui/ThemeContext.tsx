import React, { createContext, useContext, useMemo } from 'react';
import { clientConfig } from '@/core/config/clients';
import { theme as baseTheme } from '@/core/config/theme';
import type { Theme } from '@/core/config/theme';
import type { ClientConfig } from '@/core/config/clients';

interface ThemeContextValue {
  /** Full base token set — spacing, radii, typography, status/risk colors */
  theme: Theme;
  /** Client-specific brand colors (primary, primaryDark, secondary) */
  brand: ClientConfig['theme'];
  /** Client assets (logo image source) */
  assets: ClientConfig['assets'];
  /**
   * Convenience: base colors merged with brand overrides.
   * Prefer this over theme.colors for anything that should respect the active client brand.
   */
  colors: Theme['colors'] & ClientConfig['theme'];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // clientConfig is a build-time singleton — deps array is intentionally empty
  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: baseTheme,
      brand: clientConfig.theme,
      assets: clientConfig.assets,
      colors: { ...baseTheme.colors, ...clientConfig.theme },
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
