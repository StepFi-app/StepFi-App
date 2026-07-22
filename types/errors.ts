/**
 * Typed error class for the API client layer.
 *
 * Every service function and hook can catch an `ApiClientError` and know
 * exactly what went wrong, without parsing raw Axios error shapes.
 *
 * Usage:
 * ```ts
 * try { await api.get(...) }
 * catch (e) {
 *   if (e instanceof ApiClientError) {
 *     showToast(e.userMessage, e.statusCode);
 *   }
 * }
 * ```
 */

export enum ApiErrorCode {
  /** Request took longer than the configured timeout */
  TIMEOUT = 'TIMEOUT',
  /** No network connectivity available */
  OFFLINE = 'OFFLINE',
  /** HTTP 401 – token expired and refresh failed */
  UNAUTHORIZED = 'UNAUTHORIZED',
  /** HTTP 4xx other than 401 */
  CLIENT_ERROR = 'CLIENT_ERROR',
  /** HTTP 5xx */
  SERVER_ERROR = 'SERVER_ERROR',
  /** Network-level failure (DNS, connection refused, etc.) */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Request was queued for offline replay */
  OFFLINE_QUEUED = 'OFFLINE_QUEUED',
  /** Catch-all for unexpected errors */
  UNKNOWN = 'UNKNOWN',
}

const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: ApiErrorCode.CLIENT_ERROR,
  401: ApiErrorCode.UNAUTHORIZED,
  403: ApiErrorCode.CLIENT_ERROR,
  404: ApiErrorCode.CLIENT_ERROR,
  409: ApiErrorCode.CLIENT_ERROR,
  422: ApiErrorCode.CLIENT_ERROR,
  429: ApiErrorCode.CLIENT_ERROR,
  500: ApiErrorCode.SERVER_ERROR,
  502: ApiErrorCode.SERVER_ERROR,
  503: ApiErrorCode.SERVER_ERROR,
  504: ApiErrorCode.SERVER_ERROR,
};

export class ApiClientError extends Error {
  /** Machine-readable error code */
  readonly code: ApiErrorCode;

  /** HTTP status code, or 0 for network/timeout/offline errors */
  readonly statusCode: number;

  /** Human-readable message safe to show in the UI */
  readonly userMessage: string;

  /** The original error (e.g. AxiosError) for debugging / Sentry */
  readonly cause: unknown;

  constructor(opts: {
    code: ApiErrorCode;
    statusCode?: number;
    message?: string;
    userMessage?: string;
    cause?: unknown;
  }) {
    super(opts.message ?? opts.userMessage ?? 'An unexpected error occurred');
    this.name = 'ApiClientError';
    this.code = opts.code;
    this.statusCode = opts.statusCode ?? 0;
    this.userMessage = opts.userMessage ?? this.message;
    this.cause = opts.cause;
  }

  /** Whether the error is likely transient and can be retried */
  get isRetryable(): boolean {
    return (
      this.code === ApiErrorCode.NETWORK_ERROR ||
      this.code === ApiErrorCode.SERVER_ERROR ||
      this.code === ApiErrorCode.TIMEOUT
    );
  }

  /** Create an ApiClientError from an Axios-style error shape */
  static fromAxiosError(error: {
    code?: string;
    message?: string;
    response?: { status?: number; data?: { message?: string } };
    request?: unknown;
  }): ApiClientError {
    const statusCode = error.response?.status ?? 0;
    const serverMsg = error.response?.data?.message;

    // Request timeout (axios code ECONNABORTED)
    if (error.code === 'ECONNABORTED') {
      return new ApiClientError({
        code: ApiErrorCode.TIMEOUT,
        statusCode: 0,
        message: serverMsg ?? error.message,
        userMessage: 'The request timed out. Please check your connection and try again.',
        cause: error,
      });
    }

    // Network-level failure (DNS, connection refused, etc.)
    if (error.code === 'ERR_NETWORK') {
      return new ApiClientError({
        code: ApiErrorCode.NETWORK_ERROR,
        statusCode: 0,
        message: serverMsg ?? error.message,
        userMessage: 'A network error occurred. Please check your connection.',
        cause: error,
      });
    }

    // Known HTTP status → code mapping
    const code = STATUS_TO_CODE[statusCode] ?? ApiErrorCode.UNKNOWN;

    return new ApiClientError({
      code,
      statusCode,
      message: serverMsg ?? error.message ?? `HTTP ${statusCode}`,
      userMessage: userFacingMessage(code, statusCode, serverMsg),
      cause: error,
    });
  }

  /** Create an ApiClientError for offline queued requests */
  static offlineQueued(actionId: string): ApiClientError {
    return new ApiClientError({
      code: ApiErrorCode.OFFLINE_QUEUED,
      statusCode: 202,
      message: 'Request queued for offline replay',
      userMessage: "We'll complete this action once you're back online.",
      cause: null,
    });
  }
}

function userFacingMessage(
  code: ApiErrorCode,
  statusCode: number,
  serverMsg?: string,
): string {
  // Prefer the server's message for 4xx since it may contain validation details
  if (statusCode >= 400 && statusCode < 500 && serverMsg) {
    return serverMsg;
  }

  switch (code) {
    case ApiErrorCode.TIMEOUT:
      return 'The request timed out. Please check your connection and try again.';
    case ApiErrorCode.OFFLINE:
      return 'You appear to be offline. The action has been queued and will complete when you reconnect.';
    case ApiErrorCode.UNAUTHORIZED:
      return 'Your session has expired. Please sign in again.';
    case ApiErrorCode.CLIENT_ERROR:
      return serverMsg ?? 'Something went wrong with your request. Please try again.';
    case ApiErrorCode.SERVER_ERROR:
      return 'Our server is having trouble. Please try again in a moment.';
    case ApiErrorCode.NETWORK_ERROR:
      return 'A network error occurred. Please check your connection.';
    case ApiErrorCode.OFFLINE_QUEUED:
      return "We'll complete this action once you're back online.";
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}
