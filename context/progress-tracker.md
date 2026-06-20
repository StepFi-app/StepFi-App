# Progress Tracker — StepFi-App

Update this file after every completed screen, component, hook, or architectural decision. Progress state must reflect the actual working state — not the intended state.

---

## Current Phase

**Phase 2 — Wallet Integration**

## Current Goal

Implement wallet connection and transaction signing via Freighter (web) and Lobstr (WalletConnect v2, mobile).

---

## Completed

### Project Setup
- `app.json` — name updated to StepFi (scheme `stepfi`, expo-router + expo-secure-store plugins, web bundler `metro` + output `single`, typed routes enabled, splash/adaptive-icon background `#080F1A`)
- `package.json` — name updated to stepfi-app; entry switched to `expo-router/entry`; added `axios`, `zustand`, `expo-secure-store`
- All source files cleaned — zero external project references
- README.md fully written as StepFi-App
- NativeWind configured (tailwind.config.js, metro.config.js)
- Lucide React Native installed as the icon library
- `.env.example` with `EXPO_PUBLIC_API_URL`

### Foundation Constants & Types
- `constants/colors.ts` — full StepFi dark theme tokens (background/surface/elevated/subtle/borders, text scale, brand blue/green w/ dim variants, cta, error/warning/success w/ dim variants, tier sub-object)
- `constants/config.ts` — `API_BASE_URL` (env-driven), `APP_NAME`, `APP_TAGLINE`
- `constants/theme.ts` — `spacing`, `borderRadius`, `fontSize` scales
- `types/api.types.ts` — `ApiResponse<T>`, `ApiError`, `PaginatedResponse<T>`
- `types/loan.types.ts` — `LoanStatus`, `LoanType`, `Installment`, `Loan`
- `types/wallet.types.ts` — `WalletSession`, `SignXdrResult`, `WalletConnectionStatus`
- `types/user.types.ts` — `LearnerProfile` (added to satisfy `user.store`; mirrors API `learner_profiles` shape)

### Service Layer
- `services/api.ts` — Axios instance, bearer-token request interceptor, single-flight 401 refresh-and-retry interceptor, redirect to `/(auth)/sign-in` on refresh failure
- `services/auth.service.ts` — `getNonce`, `verify`, `refresh`
- `services/reputation.service.ts` — `getScore(wallet)`
- `services/loans.service.ts` — `getMyLoans`, `getLoanById`, `getAvailableCredit`, `createLoan`, `repayInstallment`

### Zustand Stores
- `stores/auth.store.ts` — tokens + wallet address persisted via Expo SecureStore, `hydrate()` invoked from root layout
- `stores/user.store.ts` — `profile`, `reputation`, `isLoading`
- `stores/loans.store.ts` — `loans`, `selectedLoan`, `isLoading`

### Navigation (Expo Router)
- `app/_layout.tsx` — root Stack, hydrates auth on mount, redirects unauth → `/(auth)/sign-in`, auth-in-auth-group → `/(tabs)/pay`
- `app/(auth)/_layout.tsx` — Stack
- `app/(tabs)/_layout.tsx` — bottom Tabs (pay/invest/settings) with Lucide icons (`CreditCard`, `TrendingUp`, `Settings`), brand-green active tint
- `app/(tabs)/pay.tsx`, `app/(tabs)/invest.tsx`, `app/(tabs)/settings.tsx` — placeholders

### CI / CD
- `.github/workflows/eas-build.yml` — automated EAS production build triggered on `v*` tag push; builds Android APK, creates GitHub Release, attaches APK as asset
- `eas.json` — production profile configured with `android.buildType: apk`
- `README.md` — release process documented under 🚢 Release Process

### Verification
- `npx expo export --platform web` — succeeded (2394 modules bundled, exit 0)

### Wallet Integration
- `services/wallet.service.ts` — Freighter API integration (`connectFreighter`, `signWithFreighter`) and Lobstr WalletConnect v2 (`initWalletConnect`, `getLobstrConnectionUri`, `approveLobstrSession`, `signWithLobstr`); session persistence via SecureStore; session expiry auto-disconnect listeners
- `stores/wallet.store.ts` — Zustand store with `{ address, sessionId, walletType, isConnected, isConnecting, isSigning, error, pairingUri }`; actions: `connectFreighter`, `initLobstrConnection`, `completeLobstrConnection`, `disconnect`, `signXdr`; SecureStore persistence for auto-restore on app restart
- `hooks/useWallet.ts` — Clean hook wrapping store selectors with auto-hydrate on mount
- `components/wallet/ConnectModal.tsx` — QR code modal using `react-native-qrcode-svg`; Lobstr deep-link button; handles loading (QR generation & approval wait), success, and error states; session expiry handled via WC event listeners
- `app/(auth)/sign-in.tsx` — Two wallet options: Freighter (Puzzle icon, blue border) and Lobstr (QrCode icon, green border); connected state with Continue/Disconnect; loading, error, empty states all handled
- `constants/config.ts` — Updated to read `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `.env.example` — Added `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID`
- Dependencies added: `@stellar/freighter-api`, `react-native-qrcode-svg`

---

## In Progress

- None currently.

---

## Next Up (In Order)

### Shared Components (Design System — built from scratch)
1. components/shared/Button.tsx
2. components/shared/Card.tsx
3. components/shared/EmptyState.tsx
4. components/shared/Loader.tsx
5. components/shared/Input.tsx
6. components/shared/ReputationBadge.tsx
7. components/shared/InstallmentRow.tsx
8. components/shared/NotificationsPanel.tsx
9. components/shared/ConfirmTransaction.tsx

### Screens (all redesigned from scratch)
10. app/(auth)/register.tsx
11. app/(tabs)/pay.tsx
12. app/(tabs)/invest.tsx
13. app/(tabs)/settings.tsx
14. app/loan/[id].tsx
15. app/loan/apply.tsx

### Deployment
16. Expo preview build (EAS)
17. Netlify web build
18. EAS automated production build pipeline — GitHub Actions workflow triggered on `v*` tag push, builds APK via `eas build`, attaches to GitHub Release

---

## Screen Status

| Screen | Route | Status | Notes |
|---|---|---|---|
| Sign In | /(auth)/sign-in | ✅ Completed | Two wallet buttons (Freighter + Lobstr), QR modal, connected/disconnected states |
| Register | /(auth)/register | To redesign | Shell exists, no real logic or design |
| Pay Dashboard | /(tabs)/pay | To redesign | Shell exists, data hardcoded |
| Invest Dashboard | /(tabs)/invest | To redesign | Shell exists, data hardcoded |
| Settings | /(tabs)/settings | To redesign | Shell exists, local-only toggles |
| Loan Detail | /loan/[id] | Not started | — |
| Loan Apply | /loan/apply | Not started | — |
| Vendor Browse | — | Not started | — |
| Reputation Detail | — | Not started | — |
| Onboarding | — | Not started | — |
| Wallet Setup Guide | — | Not started | — |

---

## Component Status

| Component | Status |
|---|---|
| Button.tsx | Not started |
| Card.tsx | Not started |
| EmptyState.tsx | Not started |
| Loader.tsx | Not started |
| Input.tsx | Not started |
| ReputationBadge.tsx | Not started |
| InstallmentRow.tsx | Not started |
| NotificationsPanel.tsx | Not started |
| ConfirmTransaction.tsx | Not started — critical before any blockchain action |
| ConnectModal.tsx | ✅ Completed — QR code, Lobstr deep-link, loading/error/success states |

---

## Open Questions

- Does StepFi-App target Android only, iOS only, or both?
- Which wallets at launch — Lobstr only, or Lobstr + xBull?
- Should amounts display in USD equivalent, local currency, or XLM/USDC only?
- Should sponsor/LP features be in the same app or a separate app?

---

## Architecture Decisions

- Expo Router — file-based routing, simpler auth guards
- Zustand — simpler API, less boilerplate
- Axios — JWT refresh handled globally via interceptors
- WalletConnect v2 — mobile deep link signing for Lobstr and xBull
- Expo SecureStore — encrypted JWT token storage (and wallet session persistence)
- Dark theme only — no light mode in v1
- Lucide React Native — single icon library, stroke-based only
- All screens and components built from scratch to StepFi's own design system
- No custodial wallet in v1
- Freighter for web/browser, Lobstr (via WalletConnect v2) for mobile

---

## Session Notes

- constants/colors.ts is the single source of truth for all colors
- All WalletConnect logic stays in stores/wallet.store.ts
- Every screen must handle loading, error, and empty states
- Use the frontend-design skill for all screen and component work
- Run npx expo start and verify before committing any UI changes
- `App.tsx` is legacy (entry switched to `expo-router/entry`) — safe to delete
- Wallet session persists via SecureStore on mobile, localStorage on web
- Session_delete and session_expire events auto-trigger disconnect
- No hardcoded hex colors — all reference constants/colors.ts
- No API calls in screen files — only store actions and hooks
- Lucide React Native used for all icons