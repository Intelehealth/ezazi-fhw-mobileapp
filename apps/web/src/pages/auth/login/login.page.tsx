import { LoginComponent } from '../../../modules/auth/login.component';

/**
 * `pages/*.page.tsx` per §3 — route target only, no business logic, just
 * composes the module. Centering/padding now lives in
 * components/layout/auth-layout.component.tsx (the layout route this page
 * renders inside of — see routes/app.routes.tsx), matching how Angular's
 * LoginComponent's own markup has no outer wrapper beyond what
 * SessionComponent already provides.
 */
export default function LoginPage() {
  return <LoginComponent />;
}
