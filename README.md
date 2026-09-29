<div align="center">

<img src="./assets/icon.png" alt="StepFi" width="96" height="96" />

# StepFi-App

**Reputation-based, step-by-step credit (BNPL) for students, interns, and small vendors — settled on Stellar.**

The official StepFi mobile client, built with Expo + React Native.

[![CI](https://github.com/StepFi-app/StepFi-App/actions/workflows/ci.yml/badge.svg)](https://github.com/StepFi-app/StepFi-App/actions/workflows/ci.yml)
[![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=white)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Stellar](https://img.shields.io/badge/Stellar-Soroban-7D00FF?logo=stellar&logoColor=white)](https://stellar.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#-contributing)

[Quick Start](#-quick-start) · [Architecture](#-where-it-fits) · [Features](#-features) · [Testing](#-testing) · [Roadmap](#-roadmap) · [StepFi org](https://github.com/StepFi-app)

</div>

---

## 📖 What is StepFi?

StepFi lets learners and interns borrow small amounts against an **on-chain reputation score** instead of collateral, repay in scheduled installments, and build a credit history — while sponsors fund a shared liquidity pool and vendors get paid directly. All credit logic, repayment, and reputation live in Soroban smart contracts on **Stellar**; this repo is the **mobile app** users hold in their hands.

- 🎓 **Learners** connect a wallet, see their credit limit and APR (both derived from reputation), request a loan, and repay on a schedule.
- 💚 **Sponsors** back the liquidity pool that funds loans.
- 🏪 **Vendors** are paid on loan disbursement and tracked in an on-chain registry.

> **This repo is the learner client.** Sponsor and vendor experiences live in [StepFi-Web](https://github.com/StepFi-app/StepFi-Web); this app focuses on the learner journey.

## 🗺️ Where it fits

StepFi-App is one of six repositories in the StepFi protocol. It talks to **StepFi-API** over REST (wallet-signature JWT), signs transactions through the user's **wallet**, and ultimately drives the **StepFi-Contracts** deployed on Stellar.

<div align="center">

<img src="./assets/architecture.svg" alt="StepFi system architecture — StepFi-App highlighted" width="900" />

</div>

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 20 | Matches CI |
| npm | ≥ 10 | Uses `--legacy-peer-deps` (Expo 54 peer graph) |
| Expo CLI | bundled | Invoked via `npx expo` |
| Xcode / Android Studio | latest | Only for native simulators/devices |
| A Stellar wallet | — | [Freighter](https://www.freighter.app) (web) or [Lobstr](https://lobstr.co) (mobile, via WalletConnect) |

### Install & run

```bash
git clone https://github.com/StepFi-app/StepFi-App.git
cd StepFi-App
npm install --legacy-peer-deps

# start the dev server (choose a target from the Expo menu)
npm start
npm run android   # Android device/emulator
npm run ios       # iOS simulator
npm run web       # browser
```

### Configuration

Create a `.env` (loaded by Expo as `EXPO_PUBLIC_*` at build time):

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | Base URL of [StepFi-API](https://github.com/StepFi-app/StepFi-API) |
| `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project ID (Lobstr / mobile) |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN (optional — Sentry is skipped if unset) |

> No secrets are bundled. `EXPO_PUBLIC_*` values are public by design; never put private keys here.

## 🧭 App structure

```
app/                       # expo-router routes (file-based)
├── (auth)/                # onboarding, role-select, sign-in, register
├── (tabs)/                # Home · Loans · Simulate · Calendar · Score · Settings
├── _layout.tsx            # root: auth guard, biometric gate, idle-lock, Sentry, netinfo
└── index.tsx              # entry redirect
components/                # shared UI (wallet, reputation, cards…)
hooks/                     # useWallet, invest/, reputation/ (+ pure, tested utils)
services/                  # api, auth, wallet, loans, reputation, notifications, sentry
stores/                    # Zustand: auth, user, wallet, loans
src/
├── security/              # biometric.service, security.store, lockout
├── offline/               # queue, sync, TTL cache, connectivity store
├── transactions/          # transaction-signer.service
└── locales/               # i18n (en · fr · pt)
```

## 🧱 Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Expo `~54` · React Native `0.81` · React `19` |
| Routing | `expo-router` (file-based) |
| Language | TypeScript `~5.9` |
| State | Zustand `5` |
| Styling | NativeWind + Tailwind `3.4` |
| Wallets | `@stellar/freighter-api` · `@walletconnect/sign-client` |
| Animation | `react-native-reanimated` `4` · `react-native-svg` |
| Storage | `expo-secure-store` (secrets) · AsyncStorage (offline queue) |
| Networking | `axios` |
| i18n | `i18next` + `react-i18next` + `expo-localization` |
| Observability | `@sentry/react-native` |

## ✨ Features

| Feature | Status | Where |
|---------|--------|-------|
| Wallet connect — Freighter (web) + Lobstr (WalletConnect) | ✅ | [`services/wallet.service.ts`](services/wallet.service.ts), [`hooks/useWallet.ts`](hooks/useWallet.ts) |
| Biometric + PIN app lock | ✅ | [`src/security/biometric.service.ts`](src/security/biometric.service.ts) |
| Persisted lockout & idle auto-lock | ✅ | [`src/security/security.store.ts`](src/security/security.store.ts), [`app/_layout.tsx`](app/_layout.tsx) |
| Reputation score + animated ring | ✅ | [`app/(tabs)/reputation.tsx`](app/(tabs)/reputation.tsx), [`components/reputation/`](components/reputation) |
| Loans list & repayment | ✅ | [`app/(tabs)/loans.tsx`](app/(tabs)/loans.tsx), [`services/loans.service.ts`](services/loans.service.ts) |
| Loan simulator | ✅ | [`app/(tabs)/simulate.tsx`](app/(tabs)/simulate.tsx) |
| Repayment calendar + reminders | ✅ | [`app/(tabs)/calendar.tsx`](app/(tabs)/calendar.tsx), [`services/notifications.service.ts`](services/notifications.service.ts) |
| Offline queue, sync & cache | ✅ | [`src/offline/`](src/offline) |
| Localization (English · Français · Português) | ✅ | [`src/locales/`](src/locales) |
| Transaction signing | ✅ | [`src/transactions/transaction-signer.service.ts`](src/transactions/transaction-signer.service.ts) |
| Real wallet-signature JWT auth | 🚧 | [#35](https://github.com/StepFi-app/StepFi-App/issues/35) — mock tokens today; blocked on a wallet message-signing primitive |
| Editable profile · notification preferences | 🗺️ | planned |

### 🔐 Wallets & signing

Two wallets are supported through one interface ([`services/wallet.service.ts`](services/wallet.service.ts)):

- **Freighter** (`@stellar/freighter-api`) for web — `requestAccess`, `signTransaction`.
- **Lobstr** over **WalletConnect** for mobile — the `stellar:pubnet` namespace negotiates `stellar_signXDR` / `stellar_signAndSubmitTransaction`.

> **Auth note:** StepFi-API's `/auth/verify` expects a signed *message*; mobile wallets over WalletConnect currently sign *XDR* only. Until a `signMessage` primitive lands, registration issues placeholder tokens — tracked in [#35](https://github.com/StepFi-app/StepFi-App/issues/35).

### 🛡️ Security

- Biometric unlock via `expo-local-authentication` with a **PIN fallback**; the PIN is salted and SHA-256 hashed with `expo-crypto` — never stored in plaintext.
- Failed-attempt **lockout** and `isLocked` are persisted (SecureStore on native, `localStorage` on web) so relaunching the app cannot bypass the gate; state resets on sign-out.
- **Idle auto-lock** after 5 minutes and on app resume ([`app/_layout.tsx`](app/_layout.tsx)).

## 🧪 Testing

Business logic is extracted into pure, unit-tested helpers.

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint + prettier --check
npm test            # jest
```

| Suite | Tests | File |
|-------|-------|------|
| Invest math | 6 | [`hooks/invest/use-invest.test.ts`](hooks/invest/use-invest.test.ts) |
| Vouch guard | 5 | [`hooks/reputation/vouch-utils.test.ts`](hooks/reputation/vouch-utils.test.ts) |
| Lockout / backoff | 6 | [`src/security/lockout.test.ts`](src/security/lockout.test.ts) |
| Transaction signer | 9 | [`src/transactions/__tests__/transaction-signer.service.test.ts`](src/transactions/__tests__/transaction-signer.service.test.ts) |
| **Total** | **26** | |

## 🔄 CI/CD

Every push and PR runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (Node 20), a **required check on `main`**:

- **web-build** — `npx expo export --platform web` (uploads the `dist/` artifact).
- **quality** — `lint` + `typecheck` + `test`.

Tagging `v*` triggers [`eas-build.yml`](.github/workflows/eas-build.yml): an EAS production Android build that is attached as an APK to a GitHub Release.

## 🛣️ Roadmap

| Milestone | Status |
|-----------|--------|
| Wallet connect (Freighter + Lobstr) | ✅ |
| Biometric + PIN lock with persisted lockout | ✅ |
| Offline queue & sync, TTL cache | ✅ |
| Localization (en · fr · pt) | ✅ |
| Reputation, loans, simulator, calendar reminders | ✅ |
| Enforced CI gate (web export + lint + typecheck + test) | ✅ |
| Real wallet-signature JWT auth (message signing) | 🚧 |
| Live wiring to StepFi-Contracts on testnet | 🚧 |
| Editable profile · notification preferences | 🗺️ |

## 🤝 Contributing

1. Branch off `main` (`feat/…`, `fix/…`, `docs/…`, `chore/…`).
2. Keep the gate green locally: `npm run typecheck && npm run lint && npm test && npx expo export --platform web`.
3. Open a PR using the template; PRs into `main` must pass the required checks.

See [`docs/contributing.md`](docs/contributing.md) for the full guide.

## 🌐 The StepFi protocol

| Repo | Role |
|------|------|
| **StepFi-App** (this repo) | Learner & sponsor mobile client |
| [StepFi-Contracts](https://github.com/StepFi-app/StepFi-Contracts) | Soroban smart contracts (credit, reputation, liquidity) |
| [StepFi-API](https://github.com/StepFi-app/StepFi-API) | Backend: auth/JWT, orchestration, jobs |
| [StepFi-Web](https://github.com/StepFi-app/StepFi-Web) | Marketing site & web dashboard |
| [StepFi-Docs](https://github.com/StepFi-app/StepFi-Docs) | Protocol documentation |

## 📄 License

Released under the [MIT License](./LICENSE).



