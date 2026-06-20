<div align="center">

![React Native](https://img.shields.io/badge/React%20Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Stellar](https://img.shields.io/badge/Stellar-7D00FF?style=for-the-badge&logo=stellar&logoColor=white)

[![Open Source](https://img.shields.io/badge/Open%20Source-Yes-green?style=flat-square)](https://opensource.org/)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)
[![CI](https://github.com/StepFi-app/StepFi-App/actions/workflows/ci.yml/badge.svg)](https://github.com/StepFi-app/StepFi-App/actions/workflows/ci.yml)

# StepFi App

**Step into your future. Credit without banks. Progress without limits.**

React Native mobile app for the StepFi learner BNPL protocol on Stellar

[Features](#-features) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [Screens](#-screens) • [Contributing](#-contributing)

</div>

---

## 📖 About

StepFi App is the mobile frontend for the StepFi protocol — a React Native application built with Expo that lets learners, interns, and early-career developers access financing for laptops, courses, and dev tools, and repay in small installments on the Stellar network.

---

## ✨ Features

- 🔐 **Wallet Authentication** — Connect your Stellar wallet (Lobstr, xBull via WalletConnect)
- 💻 **Loan Application** — Apply for financing in a simple step-by-step wizard
- 📦 **Installment Tracker** — View your repayment schedule and make payments
- ⭐ **Reputation Dashboard** — Track your on-chain credit score and history
- 🏪 **Vendor Browse** — Explore verified learning vendors by category
- 💧 **Sponsor Pool** — Companies and mentors can fund learner pools
- 🔔 **Payment Reminders** — Never miss an installment
- 🌍 **Built for Africa** — Designed for emerging market learners

---

## 🛠 Tech Stack

| Category | Technology |
|---|---|
| **Framework** | React Native 0.81 + Expo 54 |
| **Language** | TypeScript 5.9 |
| **Navigation** | Expo Router (file-based) |
| **Styling** | NativeWind (Tailwind CSS for RN) |
| **State** | Zustand |
| **API Client** | Axios with JWT interceptors |
| **Wallet** | WalletConnect v2 (Lobstr, xBull) |
| **Animations** | React Native Reanimated 4 |
| **Storage** | Expo SecureStore (JWT tokens) |
| **Icons** | Lucide React Native |

---

## 📁 Project Structure

```
StepFi-App/
├── app/                        # Expo Router screens (file-based routing)
│   ├── (auth)/                 # Auth screens (sign-in, register)
│   ├── (tabs)/                 # Main tab screens
│   │   ├── pay.tsx             # Borrower dashboard
│   │   ├── invest.tsx          # Sponsor/LP dashboard
│   │   └── settings.tsx        # User settings
│   └── _layout.tsx             # Root layout with auth guard
├── components/
│   ├── pages/                  # Full page components
│   ├── shared/                 # Reusable components
│   └── ui/                     # Base UI components
├── hooks/                      # Custom React hooks
├── services/                   # API service layer (Axios)
├── stores/                     # Zustand global state
├── constants/                  # Colors, config, theme
└── docs/                       # Documentation
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20 LTS
- Expo CLI
- iOS Simulator or Android Emulator (or Expo Go app)

### Installation

```bash
# Clone the repository
git clone https://github.com/StepFi-app/StepFi-App.git
cd StepFi-App

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Add your API base URL
# EXPO_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### Running the App

```bash
# Start Expo dev server
npx expo start

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android

# Run in web browser (basic support)
npx expo start --web
```

---

## 📱 Screens

| Screen | Status | Description |
|---|---|---|
| Onboarding | 🚧 In Progress | Welcome → Connect Wallet → Build Score → Apply |
| Sign In | 🚧 In Progress | Wallet connection via WalletConnect |
| Register | 🚧 In Progress | Create learner profile |
| Pay Dashboard | 🚧 In Progress | Active loans, next payment, credit score |
| Loan Wizard | 📋 Planned | Step-by-step loan application |
| Loan Detail | 📋 Planned | Installment timeline and payment history |
| Vendor Browse | 📋 Planned | Categories: Education, Electronics, Courses |
| Reputation Detail | 📋 Planned | Score breakdown and improvement tips |
| Invest Dashboard | 🚧 In Progress | Sponsor/LP pool overview |
| Settings | 🚧 In Progress | Profile, notifications, theme |
| Wallet Setup | 📋 Planned | First-time Stellar wallet guide |

---

## 🚢 Release Process

1. Ensure all changes are merged to `main`.
2. From `main`, run `npm version patch` (or `minor`/`major`) to bump the version and create a tag:
   ```bash
   git checkout main
   git pull
   npm version patch   # creates v0.x.x locally
   git push --tags
   ```
3. Pushing a `v*` tag triggers the [EAS Production Build](.github/workflows/eas-build.yml) workflow:
   - Builds the Android APK via EAS Build (`production` profile)
   - Creates a GitHub Release with auto-generated release notes
   - Attaches the APK as a downloadable release asset
4. Monitor the build at [Actions → EAS Production Build](https://github.com/StepFi-app/StepFi-App/actions/workflows/eas-build.yml).

> **Note:** The workflow requires the `EXPO_TOKEN` repository secret. Set it in **Settings → Secrets and variables → Actions → New repository secret** using a token from your [Expo access tokens settings](https://expo.dev/accounts/settings/access-tokens).

---

## 🤝 Contributing

We welcome React Native and Expo developers of all levels! See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, code style, and the PR process.

Check the [Roadmap](./ROADMAP.md) for open tasks and good first issues.

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

<div align="center">

**Built with ❤️ for learners everywhere**

[![Stellar](https://img.shields.io/badge/Powered%20by-Stellar-7D00FF?style=flat-square)](https://www.stellar.org/)
[![Open Source](https://img.shields.io/badge/Open%20Source-Yes-green?style=flat-square)](https://opensource.org/)

</div>
