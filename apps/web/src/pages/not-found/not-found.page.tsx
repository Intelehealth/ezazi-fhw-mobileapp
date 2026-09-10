/**
 * page-not-found.component.html/.scss redesign. Confirmed against
 * session-routing.module.ts: this route sits OUTSIDE SessionComponent's
 * split-screen layout as a plain top-level route — already wired that way
 * in routes/app.routes.tsx (ROUTES.NOT_FOUND is a sibling of the
 * AuthLayoutComponent route, not nested under it), so this page supplies
 * its own full-viewport centering rather than relying on a layout shell.
 */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-white text-center text-[#2E1E91]">
      <h1 className="text-[50px] font-bold">404</h1>
      <h6 className="text-lg font-bold">Ooops, page not found</h6>
      <hr className="my-4 w-24 border-t border-[#2E1E91]" />
      <p className="text-base font-bold">
        Sorry, but the requested page is not found.
      </p>
    </div>
  );
}
