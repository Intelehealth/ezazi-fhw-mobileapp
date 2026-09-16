import React from 'react';
import Svg, { Path } from 'react-native-svg';

/**
 * Central SVG registry — the RN equivalent of Android's drawable/*.xml.
 * Every icon/wave path lives here ONCE; screens must not declare path strings.
 */

// ─── Icons (24×24 viewBox) ────────────────────────────────────────────────────

export const iconPaths = {
  // ic_arrow_next.xml — right arrow with horizontal bar
  arrowNext: 'M12,4l-1.41,1.41L16.17,11H4v2h12.17l-5.58,5.59L12,20l8,-8z',

  // Back arrow (←)
  arrowLeft: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',

  // Visibility on — eye open
  eyeOpen:
    'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',

  // Visibility off — eye closed
  eyeOff:
    'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7z' +
    'M2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27z' +
    'M7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z',

  // Dropdown chevron (▾)
  chevronDown: 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z',

  // Checkbox tick (✓)
  check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',

  // Filled heart — splash-screen divider accent
  heart:
    'M12,21.35l-1.45-1.32C5.4,15.36,2,12.28,2,8.5C2,5.42,4.42,3,7.5,3c1.74,0,3.41,0.81,4.5,2.09' +
    'C13.09,3.81,14.76,3,16.5,3C19.58,3,22,5.42,22,8.5c0,3.78-3.4,6.86-8.55,11.54L12,21.35z',
} as const;

export type IconName = keyof typeof iconPaths;

interface AppIconProps {
  name: IconName;
  color: string;
  size?: number;
}

/** Tiny renderer so screens stop writing raw <Svg><Path/></Svg> blocks. */
export const AppIcon: React.FC<AppIconProps> = ({ name, color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d={iconPaths[name]} fill={color} />
  </Svg>
);

// ─── Decorative wave paths (each with its own viewBox) ────────────────────────
// Rendered with fill = colors.wavePink / colors.wavePinkDark, fillOpacity 0.39.

export const wavePaths = {
  // setup_top_vector.xml — WaveHeader + Setup header blob
  headerTop: {
    d: 'M688.5,279C506.5,317 570.5,336.5 328,365.5C213.91,379.14 95.15,332.24 0.5,275.25L0.5,213L0.5,-0.5H800.5V183V276.41C761.72,271.6 723.59,271.67 688.5,279Z',
    viewBox: '0 0 800 368',
  },

  // login_bottom_light_vector.xml
  loginLight: {
    d: 'M705.5,28.5C899.5,5.3 1107,157.17 1186.5,236L880.5,762L-111,586.5L-79,0C1.67,51 199.4,145.4 345,115C527,77 463,57.5 705.5,28.5Z',
    viewBox: '0 0 800 349',
  },

  // login_bottom_dark_vector.xml
  loginDark: {
    d: 'M210,29C16,5.8 -191.5,157.67 -271,236.5L35,762.5L1026.5,587L994.5,0.5C913.83,51.5 716.1,145.9 570.5,115.5C388.5,77.5 452.5,58 210,29Z',
    viewBox: '0 0 800 218',
  },

  // splash_bottom_light_bg.xml
  splashLight: {
    d: 'M711.5,28.5C905.5,5.3 1113,157.17 1192.5,236L886.5,762L-105,586.5L-73,0C7.67,51 205.4,145.4 351,115C533,77 469,57.5 711.5,28.5Z',
    viewBox: '0 0 800 564',
  },

  // splash_bottom_dark_bg.xml
  splashDark: {
    d: 'M193,29C-1,5.8 -208.5,157.67 -288,236.5L18,762.5L1009.5,587L977.5,0.5C896.83,51.5 699.1,145.9 553.5,115.5C371.5,77.5 435.5,58 193,29Z',
    viewBox: '0 0 800 448',
  },
} as const;

// ─── New-splash bottom hills (Figma "Vector 6"/"Vector 7") ────────────────────
// Two-layer rounded hill silhouette behind the splash illustration, each with
// its own left-to-right gradient. Rendered with preserveAspectRatio="none",
// stretched to the screen width like the wavePaths above.

export const splashHills = {
  // Vector 7.svg — shorter, more transparent back layer
  back: {
    d: 'M-97.3514 45.0254L-283.518 134.344C-328.429 155.891 -357 201.288 -357 251.1C-357 322.62 -299.022 380.598 -227.501 380.598H850.079C935.087 380.598 1004 311.686 1004 226.678C1004 115.618 889.966 41.1108 788.258 85.7175L686.102 130.521C629.208 155.473 564.569 155.995 507.279 131.965L277.578 35.617C156.998 -14.9604 20.5403 -11.5361 -97.3514 45.0254Z',
    viewBox: '0 0 800 281',
    gradient: ['#3E2BB1', '#3922CF'] as const,
    fillOpacity: 0.8,
  },
  // Vector 6.svg — taller, fully opaque front layer
  front: {
    d: 'M191.649 45.0254L5.48184 134.344C-39.4289 155.891 -68 201.288 -68 251.1C-68 322.62 -10.0215 380.598 61.4986 380.598H1139.08C1224.09 380.598 1293 311.686 1293 226.678C1293 115.618 1178.97 41.1108 1077.26 85.7175L975.102 130.521C918.208 155.473 853.569 155.995 796.279 131.965L566.578 35.617C445.998 -14.9604 309.54 -11.5361 191.649 45.0254Z',
    viewBox: '0 0 800 317',
    gradient: ['#2E1E91', '#3922CF'] as const,
    fillOpacity: 1,
  },
} as const;
