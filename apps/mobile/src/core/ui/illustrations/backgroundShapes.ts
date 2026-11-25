/** Decorative background shapes: login/splash waves and the new-splash hills (moved out of the icon registry). */

// ─── Decorative wave paths (each with its own viewBox) ────────────────────────
// Rendered with fill = colors.wavePink / colors.wavePinkDark, fillOpacity 0.39.

export const wavePaths = {
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
