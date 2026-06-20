import { useWalletStore } from '../../stores/wallet.store';
import { transactionsService } from '../../services/transactions.service';
import {
  TransactionError,
  TransactionErrorCode,
} from '../../types/transaction.types';
import type { TransactionResult } from '../../types/transaction.types';

function mapWalletError(error: unknown): TransactionError {
  if (error instanceof TransactionError) return error;

  const message =
    error instanceof Error ? error.message : 'An unknown error occurred during signing';

  if (message.toLowerCase().includes('reject') || message.toLowerCase().includes('decline')) {
    return new TransactionError(
      TransactionErrorCode.USER_REJECTED,
      'Transaction was rejected by the user.',
      error,
    );
  }

  if (
    message.toLowerCase().includes('timeout') ||
    message.toLowerCase().includes('timed out')
  ) {
    return new TransactionError(
      TransactionErrorCode.NETWORK_TIMEOUT,
      'Signing request timed out. Please try again.',
      error,
    );
  }

  if (
    message.toLowerCase().includes('insufficient') ||
    message.toLowerCase().includes('balance')
  ) {
    return new TransactionError(
      TransactionErrorCode.INSUFFICIENT_FUNDS,
      'Insufficient funds to complete this transaction.',
      error,
    );
  }

  if (message.toLowerCase().includes('simulation') || message.toLowerCase().includes('failed')) {
    return new TransactionError(
      TransactionErrorCode.SIMULATION_FAILED,
      'Transaction simulation failed. Please try again.',
      error,
    );
  }

  return new TransactionError(
    TransactionErrorCode.UNKNOWN,
    message,
    error,
  );
}

function mapSubmissionError(error: unknown): TransactionError {
  if (error instanceof TransactionError) return error;

  const message =
    error instanceof Error ? error.message : 'An unknown error occurred during submission';

  if (
    message.toLowerCase().includes('timeout') ||
    message.toLowerCase().includes('timed out')
  ) {
    return new TransactionError(
      TransactionErrorCode.NETWORK_TIMEOUT,
      'Submission timed out. Please check your connection and try again.',
      error,
    );
  }

  if (
    message.toLowerCase().includes('insufficient') ||
    message.toLowerCase().includes('balance')
  ) {
    return new TransactionError(
      TransactionErrorCode.INSUFFICIENT_FUNDS,
      'Insufficient funds to complete this transaction.',
      error,
    );
  }

  return new TransactionError(
    TransactionErrorCode.SUBMISSION_FAILED,
    `Transaction submission failed: ${message}`,
    error,
  );
}

class TransactionSignerService {
  private static instance: TransactionSignerService | null = null;

  private constructor() {}

  static getInstance(): TransactionSignerService {
    if (!TransactionSignerService.instance) {
      TransactionSignerService.instance = new TransactionSignerService();
    }
    return TransactionSignerService.instance;
  }

  async signAndBroadcast(unsignedXdr: string): Promise<TransactionResult> {
    const walletState = useWalletStore.getState();

    if (!walletState.isConnected || !walletState.publicKey) {
      throw new TransactionError(
        TransactionErrorCode.WALLET_NOT_CONNECTED,
        'Wallet is not connected. Please connect your wallet first.',
      );
    }

    walletState.setSigning(true);

    let signedXdr: string;
    try {
      signedXdr = await walletState.signXdr(unsignedXdr);
    } catch (error) {
      walletState.setSigning(false);
      throw mapWalletError(error);
    }

    walletState.setSigning(false);

    try {
      return await transactionsService.submitSignedXdr(signedXdr);
    } catch (error) {
      throw mapSubmissionError(error);
    }
  }
}

export const transactionSigner = TransactionSignerService.getInstance();
