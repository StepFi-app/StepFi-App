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
