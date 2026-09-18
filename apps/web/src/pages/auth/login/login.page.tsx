import { LoginComponent } from '../../../modules/auth/login.component';

/**
 * `pages/*.page.tsx` per §3 — route target only, no business logic, just
 * composes the module.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[--color-app-bg] p-4">
      <LoginComponent />
    </div>
  );
}
