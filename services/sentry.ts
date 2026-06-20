import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Sensitive field names that must never be sent to Sentry
const SENSITIVE_KEYS = new Set([
  'accessToken',
  'refreshToken',
  'signature',
  'nonce',
  'walletAddress',
  'publicKey',
  'authorization',
  'Authorization',
]);

// Helpers

/**
 * Recursively strip sensitive keys from a plain object.
 * Returns a shallow‑cloned object — the original is never mutated.
 */
function scrub<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(scrub) as unknown as T;
  }

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      cleaned[key] = '[REDACTED]';
    } else {
      cleaned[key] = scrub(value);
    }
  }
  return cleaned as T;
}

// Initialisation

let _initialised = false;

export function initSentry(): void {
  if (_initialised) return;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[Sentry] EXPO_PUBLIC_SENTRY_DSN is not set — skipping init');
    }
    return;
  }

  const release = Constants.expoConfig?.version
    ? `${Constants.expoConfig.slug ?? 'stepfi-app'}@${Constants.expoConfig.version}`
    : undefined;

  Sentry.init({
    dsn,
    release,
    environment: __DEV__ ? 'development' : 'production',

    // Sessions
    enableAutoSessionTracking: true,

    // Performance
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,

    // Data scrubbing — strip tokens / secrets before they leave the device
    beforeSend(event) {
      // Scrub extra data
      if (event.extra) {
        event.extra = scrub(event.extra);
      }

      // Scrub breadcrumb data
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((bc) => ({
          ...bc,
          data: bc.data ? scrub(bc.data) : bc.data,
        }));
      }

      // Scrub context values
      if (event.contexts) {
        event.contexts = scrub(event.contexts);
      }

      return event;
    },

    // Only send events in production unless DSN is explicitly provided in dev
    enabled: !__DEV__ || Boolean(dsn),
  });

  _initialised = true;
}

// User context

/**
 * Set the Sentry user context when a wallet connects.
 */
export function setSentryUser(walletAddress: string): void {
  Sentry.setUser({ id: walletAddress });
}

/** Clear user context on logout / wallet disconnect. */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

// Breadcrumbs

export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = 'info',
): void {
  Sentry.addBreadcrumb({
    category,
    message,
    data: data ? scrub(data) : undefined,
    level,
  });
}

// Error capture

/**
 * Capture a service‑layer error with useful tags so errors can be filtered
 * by service name and operation in the Sentry dashboard.
 */
export function captureServiceError(
  service: string,
  operation: string,
  error: unknown,
): void {
  Sentry.withScope((scope) => {
    scope.setTag('service', service);
    scope.setTag('operation', operation);

    if (error instanceof Error) {
      scope.setExtra('errorMessage', error.message);
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(`[${service}.${operation}] Non-Error thrown`, {
        level: 'error',
        extra: { rawError: scrub(error as Record<string, unknown>) },
      });
    }
  });
}

// Re-export Sentry's wrap helper for the root component
export { Sentry };
