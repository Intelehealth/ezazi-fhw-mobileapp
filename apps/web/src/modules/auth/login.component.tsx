import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/common/button.component';
import { useLogin } from '../../hooks/mutations/useLogin';
import { loginSchema, type LoginFormValues } from './login.validation';

/**
 * `modules/<feature>/*.component.tsx` per §3 — feature UI + its own
 * validation/hooks, reusable across pages.
 * pages/auth/login/login.page.tsx is the thin route wrapper around this.
 */
export function LoginComponent() {
  const { t } = useTranslation();
  const { mutate: login, isPending, error } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { username: '', password: '' },
  });

  return (
    <form
      className="w-full max-w-sm rounded-lg border border-[--color-border] bg-white p-6 shadow-sm"
      onSubmit={handleSubmit(values => login(values))}
    >
      <h1 className="mb-4 text-lg font-semibold text-[--color-dark]">
        {t('auth.loginTitle')}
      </h1>

      <label
        className="mb-1 block text-sm text-[--color-muted]"
        htmlFor="username"
      >
        {t('auth.username')}
      </label>
      <input
        id="username"
        className="mb-1 w-full rounded-md border border-[--color-border] px-3 py-2"
        {...register('username')}
      />
      {errors.username && (
        <p className="mb-3 text-xs text-red-600">{errors.username.message}</p>
      )}

      <label
        className="mb-1 block text-sm text-[--color-muted]"
        htmlFor="password"
      >
        {t('auth.password')}
      </label>
      <input
        id="password"
        type="password"
        className="mb-1 w-full rounded-md border border-[--color-border] px-3 py-2"
        {...register('password')}
      />
      {errors.password && (
        <p className="mb-3 text-xs text-red-600">{errors.password.message}</p>
      )}

      {error && <p className="mb-3 text-xs text-red-600">{error.message}</p>}

      <Button type="submit" isLoading={isPending} className="mt-2">
        {t('auth.loginButton')}
      </Button>
    </form>
  );
}
