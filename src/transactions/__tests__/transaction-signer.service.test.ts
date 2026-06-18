import {
  TransactionError,
  TransactionErrorCode,
} from '../../../types/transaction.types';

const mockGetState = jest.fn();
const mockSubmitSignedXdr = jest.fn();

jest.mock('../../../stores/wallet.store', () => ({
  useWalletStore: {
    getState: mockGetState,
  },
}));

jest.mock('../../../services/transactions.service', () => ({
  transactionsService: {
    submitSignedXdr: mockSubmitSignedXdr,
  },
}));

function createMockWalletState(overrides: Record<string, unknown> = {}) {
  return {
    isConnected: true,
    publicKey: 'GABCDEF123456789',
    isSigning: false,
    setSigning: jest.fn(),
    signXdr: jest.fn().mockResolvedValue('signed-xdr-base64'),
    ...overrides,
  };
}

describe('TransactionSigner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signAndBroadcast', () => {
    it('throws WALLET_NOT_CONNECTED when wallet is not connected', async () => {
      mockGetState.mockReturnValue(
        createMockWalletState({ isConnected: false, publicKey: null }),
      );

      const { transactionSigner: signer } = await import(
        '../transaction-signer.service'
      );

      await expect(signer.signAndBroadcast('unsigned-xdr')).rejects.toThrow(
        TransactionError,
      );
      await expect(signer.signAndBroadcast('unsigned-xdr')).rejects.toMatchObject({
        code: TransactionErrorCode.WALLET_NOT_CONNECTED,
      });
    });

    it('throws WALLET_NOT_CONNECTED when publicKey is null', async () => {
      mockGetState.mockReturnValue(
        createMockWalletState({ publicKey: null }),
      );

      const { transactionSigner: signer } = await import(
        '../transaction-signer.service'
      );

      await expect(signer.signAndBroadcast('unsigned-xdr')).rejects.toMatchObject({
        code: TransactionErrorCode.WALLET_NOT_CONNECTED,
      });
    });

    it('calls signXdr with the unsigned XDR and submits the result', async () => {
      const mockSignXdr = jest.fn().mockResolvedValue('signed-xdr-output');
      mockGetState.mockReturnValue(
        createMockWalletState({ signXdr: mockSignXdr }),
      );

      mockSubmitSignedXdr.mockResolvedValue({
        txHash: '0xabc123',
        signedXdr: 'signed-xdr-output',
      });

      const { transactionSigner: signer } = await import(
        '../transaction-signer.service'
      );

      const result = await signer.signAndBroadcast('unsigned-xdr-input');

      expect(mockSignXdr).toHaveBeenCalledWith('unsigned-xdr-input');
      expect(mockSubmitSignedXdr).toHaveBeenCalledWith('signed-xdr-output');
      expect(result).toEqual({
        txHash: '0xabc123',
        signedXdr: 'signed-xdr-output',
      });
    });

    it('sets isSigning to true during signing and false after', async () => {
      const setSigning = jest.fn();
      mockGetState.mockReturnValue(createMockWalletState({ setSigning }));
      mockSubmitSignedXdr.mockResolvedValue({
        txHash: '0xabc123',
        signedXdr: 'signed-xdr',
      });

      const { transactionSigner: signer } = await import(
        '../transaction-signer.service'
      );

      await signer.signAndBroadcast('unsigned-xdr');

      expect(setSigning).toHaveBeenCalledWith(true);
      expect(setSigning).toHaveBeenCalledWith(false);
    });

    it('maps wallet rejection to USER_REJECTED error', async () => {
      const mockSignXdr = jest
        .fn()
        .mockRejectedValue(new Error('User rejected the request'));
      mockGetState.mockReturnValue(
        createMockWalletState({ signXdr: mockSignXdr }),
      );

      const { transactionSigner: signer } = await import(
        '../transaction-signer.service'
      );

      const err = await signer
        .signAndBroadcast('unsigned-xdr')
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(TransactionError);
      expect((err as TransactionError).code).toBe(
        TransactionErrorCode.USER_REJECTED,
      );
    });

    it('maps timeout errors to NETWORK_TIMEOUT', async () => {
      const mockSignXdr = jest
        .fn()
        .mockRejectedValue(new Error('Request timed out'));
      mockGetState.mockReturnValue(
        createMockWalletState({ signXdr: mockSignXdr }),
      );

      const { transactionSigner: signer } = await import(
        '../transaction-signer.service'
      );

      const err = await signer
        .signAndBroadcast('unsigned-xdr')
        .catch((e: unknown) => e);
      expect((err as TransactionError).code).toBe(
        TransactionErrorCode.NETWORK_TIMEOUT,
      );
    });

    it('maps insufficient funds errors appropriately', async () => {
      const mockSignXdr = jest
        .fn()
        .mockRejectedValue(
          new Error('insufficient balance for this transaction'),
        );
      mockGetState.mockReturnValue(
        createMockWalletState({ signXdr: mockSignXdr }),
      );

      const { transactionSigner: signer } = await import(
        '../transaction-signer.service'
      );

      const err = await signer
        .signAndBroadcast('unsigned-xdr')
        .catch((e: unknown) => e);
      expect((err as TransactionError).code).toBe(
        TransactionErrorCode.INSUFFICIENT_FUNDS,
      );
    });

    it('maps submission failures to SUBMISSION_FAILED', async () => {
      mockGetState.mockReturnValue(createMockWalletState({}));
      mockSubmitSignedXdr.mockRejectedValue(new Error('Server error'));

      const { transactionSigner: signer } = await import(
        '../transaction-signer.service'
      );

      const err = await signer
        .signAndBroadcast('unsigned-xdr')
        .catch((e: unknown) => e);
      expect((err as TransactionError).code).toBe(
        TransactionErrorCode.SUBMISSION_FAILED,
      );
    });

    it('sets isSigning to false on error', async () => {
      const setSigning = jest.fn();
      mockGetState.mockReturnValue(
        createMockWalletState({
          setSigning,
          signXdr: jest.fn().mockRejectedValue(new Error('error')),
        }),
      );

      const { transactionSigner: signer } = await import(
        '../transaction-signer.service'
      );

      await signer.signAndBroadcast('unsigned-xdr').catch(() => {});
      expect(setSigning).toHaveBeenCalledWith(true);
      expect(setSigning).toHaveBeenCalledWith(false);
    });
  });
});
