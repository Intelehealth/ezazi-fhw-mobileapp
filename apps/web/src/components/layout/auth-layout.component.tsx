import type { CSSProperties, ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import bgImage from '../../assets/ezazi/ezazi-bg.png';
import intelehealthLogo from '../../assets/images/Intelehealth-logo-blue.png';
import { clientConfig } from '../../config/clients';

interface AuthLayoutComponentProps {
  children?: ReactNode;
}

/**
 * Split-screen session shell — Angular's session.component.html/.scss.
 * Left panel: curved branding background, centered client-aware logo,
 * tagline + divider accent. Right panel: a small client logo (mobile only,
 * per the Angular markup's col-sm-6/col-6 block) above the routed form.
 *
 * `children` falls back to <Outlet/> so this also works as a react-router
 * v7 layout route (app.routes.tsx nests the login route under it, matching
 * how session.component.html wraps <router-outlet>).
 *
 * The logo is NOT vertically centered in this panel, despite the flex
 * `justify-center` on its container — `.ezazi-logo` also has its own
 * `position: relative; top: -100px`, shifting it up from that centered
 * position (confirmed against the live site, ezazi.intelehealth.org, not
 * just the .scss — a flex-centered guess without that offset visibly sits
 * too low/too "dead center").
 *
 * ezazi-bg.png is a solid #FFDEE7 shape with a *transparent* cutout (not
 * opaque white, despite how it looks against a white background in an
 * image viewer) — the curve effect only appears because Angular's
 * `.bg-banner` sets no background-color of its own, letting the cutout
 * reveal whatever's behind it. A `bg-[#FFDEE7]` fallback at every
 * breakpoint (this component's first draft) painted straight through that
 * cutout with more pink, hiding the curve entirely — it's scoped to
 * `max-md:` only below, where the image itself is swapped out.
 *
 * `.bg-banner` (the background-image class) is on session.component.html's
 * *outer* row — spanning both columns — not just the left one, so its
 * `background-size: 70% 100%` is computed against the full row width.
 * Sizing the image against just the left panel's own half-width (this
 * component's first draft) stretched/positioned the curve differently
 * than the real thing — the outer div below carries the image for
 * exactly this reason, matching the Angular structure, not just the
 * visual result.
 *
 * The right (form) panel has NO background-color of its own in
 * `.main-container`'s .scss either — it relies on `body`'s global white
 * (see index.css) showing through, which is exactly why the curve is
 * allowed to bleed past the 50% column split near the bottom instead of
 * getting clipped there. Giving this div its own `bg-white` (this
 * component's second draft) opaquely masked that — deliberately left
 * without one.
 *
 * The right panel's content stays top-aligned (no vertical centering) —
 * matching `.main-container`, a plain block with no flex centering of its
 * own. On a very tall screen (2560×1600+) that does leave a growing gap
 * below the form, but centering it broke the correct, verified-pixel-exact
 * match to the real login screen at normal laptop heights, which matters
 * more than the tall-screen case.
 *
 * The "from Intelehealth" mark below the tagline is commented out in
 * session.component.html's source (both here and on ezazi_dev_master) but
 * is live on the actual deployed site (ezazi.intelehealth.org) — gated on
 * `clientConfig.branding.showPoweredByLogo`, which is exactly what that
 * flag is for (true for the default/eZAZI client, false for Nepal, see
 * config/clients/{default,nepal}.ts).
 */
export function AuthLayoutComponent({ children }: AuthLayoutComponentProps) {
  return (
    <div
      className="flex min-h-screen flex-col-reverse bg-no-repeat max-md:!bg-none md:flex-row md:bg-[length:70%_100%]"
      style={{ backgroundImage: `url(${bgImage})` } as CSSProperties}
    >
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center py-16 max-md:bg-[#FFDEE7] md:w-1/2">
        <img
          className="relative -top-[100px] w-[304px]"
          src={clientConfig.assets.logo}
          alt={clientConfig.displayName}
        />
        <div className="absolute bottom-[150px] w-full px-6 text-center">
          <span className="absolute -top-[18px] left-1/2 h-[3px] w-[151px] -translate-x-1/2 rounded-full bg-[#ED1A56]" />
          <p className="text-2xl leading-[150%] text-[#2E1E91]">
            Empowering labor management
            <br />
            through digital precision
          </p>
          {clientConfig.branding.showPoweredByLogo && (
            <div className="mt-6">
              <span className="text-2xl leading-[150%] text-[#2E1E91]">
                from
              </span>
              <img
                className="mx-auto mt-1 w-[200px]"
                src={intelehealthLogo}
                alt="Intelehealth"
              />
            </div>
          )}
        </div>
      </div>

      <div className="w-full px-6 py-5 md:w-1/2 md:px-[60px] md:py-5">
        <div className="mb-4 md:hidden">
          <img
            className="w-1/2 rounded"
            src={clientConfig.assets.logo}
            alt={clientConfig.displayName}
          />
        </div>
        {children ?? <Outlet />}
      </div>
    </div>
  );
}
