export const config = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
  APP_NAME: 'StepFi',
  APP_TAGLINE: 'Step into your future. Credit without banks. Progress without limits.',
  WC_PROJECT_ID: process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '',
} as const;

export type AppConfig = typeof config;
