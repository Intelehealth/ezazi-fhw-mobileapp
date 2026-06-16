# auth screens — Sprint 42

| Ticket | Screen | File | Activity (legacy) |
|---|---|---|---|
| EZ-920 | Splash | `SplashScreen.tsx` | `SplashActivity` |
| EZ-928 | First-run Setup | `SetupScreen.tsx` | `SetupActivity` |
| EZ-932 | Login | `LoginScreen.tsx` | `LoginActivity` |
| EZ-933 | Forgot Pwd — request OTP | `ForgotPasswordRequestScreen.tsx` | `ForgotPasswordActivity` |
| EZ-934 | Forgot Pwd — verify OTP | `ForgotPasswordVerifyScreen.tsx` | `ForgotPasswordActivity` (Fragment 2) |
| EZ-939 | Forgot Pwd — reset password | `ForgotPasswordResetScreen.tsx` | `ForgotPasswordActivity` (Fragment 3) |
| EZ-940 | Biometric unlock | (composed inside Splash + Login) — uses `expo-local-authentication` | (new — not in legacy) |
| EZ-941 | Privacy / DPDPA notice | `PrivacyNoticeScreen.tsx` | `PrivacyNoticeActivity` |
| EZ-942 | Transparent session refresh | inside `src/services/api/client.ts` (axios interceptor) | (new — was less robust in legacy) |
| EZ-943 | Logout with JWT blacklist | inside `src/stores/auth.store.ts` `.logout()` + HomeScreen menu | menu item in `HomeActivity` |

Each `*.tsx` is a compile-ready stub. Wire up the form + API call as each ticket is picked up.

### Lift-and-shift checklist (per screen)

When you implement a screen, fill in the per-screen `__LIFT_AND_SHIFT__.md` (or add a section to the PR description) covering:

1. Legacy Activity/Fragment file you ported from
2. Validation rules preserved (regex, ranges, mandatory)
3. Error messages mirrored verbatim (i18n where applicable)
4. Side effects preserved (toasts, navigation, audit logs)
5. Any deliberate deviation + reason
