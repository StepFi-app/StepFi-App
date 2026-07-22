export enum TransactionStatus {
  IDLE = 'idle',
  PREPARING = 'preparing',
  SIGNING = 'signing',
  BROADCASTING = 'broadcasting',
  SUCCESS = 'success',
  ERROR = 'error',
}

export enum TransactionErrorCode {
  USER_REJECTED = 'USER_REJECTED',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  SIMULATION_FAILED = 'SIMULATION_FAILED',
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  SUBMISSION_FAILED = 'SUBMISSION_FAILED',
  UNKNOWN = 'UNKNOWN',
}

export class TransactionError extends Error {
  constructor(
    public readonly code: TransactionErrorCode,
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

export interface TransactionResult {
  txHash: string;
  signedXdr: string;
}

// ─── Pending Transaction Tracking ────────────────────────────────────────────

export type PendingTransactionStatus =
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'expired';

export type PendingTransactionType =
  | 'LOAN_CREATION'
  | 'REPAYMENT'
  | 'VOUCH_SUBMIT'
  | 'LIQUIDITY_DEPOSIT';

export interface PendingTransaction {
  /** Unique local id for the queue entry. */
  id: string;
  /** On-chain transaction hash returned after submission. */
  txHash: string;
  /** High-level category for the transaction. */
  type: PendingTransactionType;
  /** Target loan this tx affects (if applicable). */
  targetLoanId?: string;
  /** Specific installment index within the loan (if repayment). */
  targetInstallmentIndex?: number;
  /** Amount involved in the tx (for display / idempotency). */
  amount?: number;
  /** Current resolution status. */
  status: PendingTransactionStatus;
  /** ISO timestamp when the entry was first created. */
  createdAt: number;
  /** ISO timestamp of the last status change. */
  updatedAt: number;
  /** How many times we have polled so far (for backoff). */
  retryCount: number;
  /** ISO timestamp of the last poll attempt. */
  lastPolledAt?: number;
}

/** Public-facing summary surfaced to the user. */
export interface PendingSummary {
  pendingCount: number;
  recent: PendingTransaction[];
}
