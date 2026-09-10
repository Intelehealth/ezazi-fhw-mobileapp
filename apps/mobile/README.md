# ezazi-fhw-mobileapp

eLCG mobile app for the FHW (Frontline Health Worker / Nurse). Built with **React Native + Expo SDK 57 + TypeScript strict**, on the **New Architecture**.

## Tech stack

> Authoritative versions & rules: [`ARCHITECTURE_RULES.md`](ARCHITECTURE_RULES.md) · folder structure & the "why": [`MOBILE_STACK.md`](MOBILE_STACK.md).

| Concern | Choice |
|---|---|
| Framework | React Native 0.86 + Expo SDK 57 — **New Architecture**, custom dev client (not Expo Go) |
| Language | TypeScript strict |
| Navigation | React Navigation (native-stack + bottom-tabs) |
| State | Zustand |
| HTTP | axios with refresh-token interceptor |
| Forms | react-hook-form + zod |
| Secure storage | expo-secure-store (JWT) |
| Async storage | @react-native-async-storage/async-storage |
| Biometric | expo-local-authentication |
| i18n | i18next + react-i18next + expo-localization |
| Calendar | nepali-date-converter (BS) + dayjs (AD) |
| Testing | Jest + @testing-library/react-native (jest-expo preset) |
| Offline DB | **expo-sqlite + Drizzle ORM** (`useLiveQuery` for reactivity) |
| Build | EAS Build, or a local dev-client build via `npm run android` |

## Quick start

```bash
nvm use                 # node 20
npm install
cp .env.example .env    # then edit (EXPO_PUBLIC_AUTH_GATEWAY_URL etc.)
npm start               # opens Expo Dev Tools
# or
npm run android
npm run ios
```

## Scripts

- `npm start` — Expo dev server
- `npm run android` / `npm run ios` / `npm run web`
- `npm run build:android` / `build:ios` — EAS Build
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` / `lint:fix`
- `npm test` — Jest

## Source layout

```
src/
├── config/         # env, theme, constants, feature-flags
├── navigation/     # RootNavigator (auth + app stacks)
├── screens/
│   ├── auth/       # Splash, Setup, Login, ForgotPwd×3, Privacy (Sprint 42)
│   ├── home/       # later sprints
│   ├── patient/
│   ├── labour/
│   └── …
├── services/
│   ├── api/        # axios client, per-module endpoints
│   └── storage/    # secure-store + async-storage wrappers
├── stores/         # Zustand stores (auth, app, sync)
├── hooks/
├── components/     # shared UI primitives
├── i18n/           # locales + i18next setup
├── utils/          # logger, calendar, validators
└── types/          # shared TS types
```

## Sprint 42 — Auth (EZ-920, 928, 932-934, 939-943)

See `src/screens/auth/README.md` for per-ticket mapping.

## Authoritative documents

- HLD: `~/Documents/EZAZI Project/eZAZI_Tech_Revamp_HLD_v3_3.docx`
- ADRs: `~/Documents/EZAZI Project/docs/adrs/` (ADR-002 = mobile stack)
- User stories: `~/Documents/EZAZI Project/user-stories/eZAZI_User_Stories_Mobile.xlsx`
- API contracts: `~/Documents/EZAZI Project/api-docs/openapi-mobile.yaml`

## Lift-and-shift principle

Replace tech, not behaviour. Each ported activity should preserve the legacy flow exactly — see `MODULE_TEMPLATE.md` §15 in the EZAZI Project docs.
