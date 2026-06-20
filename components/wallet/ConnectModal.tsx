import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Linking } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  QrCode,
  Smartphone,
  X,
  ExternalLink,
  AlertCircle,
  Loader,
  CheckCircle,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useWalletStore } from '../../stores/wallet.store';

const LOBSTR_DEEP_LINK = 'lobstr://';

export function ConnectModal() {
  const pairingUri = useWalletStore((s) => s.pairingUri);
  const isConnecting = useWalletStore((s) => s.isConnecting);
  const isConnected = useWalletStore((s) => s.isConnected);
  const error = useWalletStore((s) => s.error);
  const isSigning = useWalletStore((s) => s.isSigning);
  const clearError = useWalletStore((s) => s.clearError);
  const disconnect = useWalletStore((s) => s.disconnect);
  const completeLobstrConnection = useWalletStore(
    (s) => s.completeLobstrConnection
  );

  const isModalVisible =
    pairingUri !== null ||
    (isConnecting && !!pairingUri) ||
    error !== null;

  useEffect(() => {
    if (pairingUri && !isConnected && !error) {
      completeLobstrConnection().catch(() => {});
    }
  }, [pairingUri]);

  const handleClose = () => {
    if (!isSigning) {
      disconnect().catch(() => {});
      clearError();
    }
  };

  const handleOpenLobstr = async () => {
    if (!pairingUri) return;
    const encodedUri = encodeURIComponent(pairingUri);
    const deepLink = `${LOBSTR_DEEP_LINK}wc?uri=${encodedUri}`;

    try {
      await Linking.openURL(deepLink);
    } catch {
      try {
        await Linking.openURL('https://lobstr.co');
      } catch {
        // Cannot open Lobstr
      }
    }
  };

  if (!isModalVisible && !isConnected) return null;

  return (
    <Modal
      visible={isModalVisible || isConnected}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(8, 15, 26, 0.92)' }}
      >
        <View
          className="w-full rounded-3xl p-6 items-center gap-5"
          style={{
            backgroundColor: colors.elevated,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View className="flex-row items-center justify-between w-full">
            <View className="flex-row items-center gap-2">
              <Smartphone size={20} color={colors.brandGreen} />
              <Text
                className="text-lg font-semibold"
                style={{ color: colors.textPrimary }}
              >
                Connect Lobstr
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              className="h-8 w-8 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.subtle }}
              disabled={isSigning}
            >
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {error && (
            <View
              className="w-full rounded-xl p-4 flex-row items-start gap-3"
              style={{ backgroundColor: colors.errorDim }}
            >
              <AlertCircle size={18} color={colors.error} />
              <View className="flex-1 gap-2">
                <Text className="text-sm" style={{ color: colors.error }}>
                  {error}
                </Text>
                <TouchableOpacity
                  onPress={handleClose}
                  className="self-start"
                >
                  <Text
                    className="text-sm font-medium"
                    style={{ color: colors.error }}
                  >
                    Try again
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isConnected && !error && (
            <View className="items-center gap-4 py-6">
              <View
                className="h-16 w-16 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.successDim }}
              >
                <CheckCircle size={28} color={colors.success} />
              </View>
              <Text
                className="text-base font-semibold"
                style={{ color: colors.textPrimary }}
              >
                Lobstr connected successfully!
              </Text>
            </View>
          )}

          {isSigning && !error && (
            <View className="items-center gap-4 py-6">
              <View
                className="h-16 w-16 rounded-2xl items-center justify-center"
                style={{ backgroundColor: colors.brandGreenDim }}
              >
                <Loader size={28} color={colors.brandGreen} />
              </View>
              <Text
                className="text-base text-center"
                style={{ color: colors.textSecondary }}
              >
                Waiting for Lobstr to approve the connection...
              </Text>
            </View>
          )}

          {pairingUri && !isConnected && !error && !isSigning && (
            <>
              <View
                className="rounded-2xl p-4"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <QRCode
                  value={pairingUri}
                  size={240}
                  backgroundColor="#FFFFFF"
                  color="#000000"
                />
              </View>

              <Text
                className="text-sm text-center"
                style={{ color: colors.textSecondary }}
              >
                Scan this QR code with the Lobstr app on your mobile device
              </Text>

              <TouchableOpacity
                className="w-full h-12 rounded-2xl flex-row items-center justify-center gap-2"
                style={{ backgroundColor: colors.brandGreen }}
                activeOpacity={0.8}
                onPress={handleOpenLobstr}
              >
                <ExternalLink size={18} color={colors.ctaText} />
                <Text
                  className="text-base font-semibold"
                  style={{ color: colors.ctaText }}
                >
                  Open Lobstr App
                </Text>
              </TouchableOpacity>
            </>
          )}

          {!pairingUri && !isConnected && !error && (
            <View className="items-center gap-3 py-6">
              <View
                className="h-16 w-16 rounded-2xl items-center justify-center"
                style={{ backgroundColor: colors.brandGreenDim }}
              >
                <QrCode size={28} color={colors.brandGreen} />
              </View>
              <Text
                className="text-base text-center"
                style={{ color: colors.textSecondary }}
              >
                Generating connection QR code...
              </Text>
            </View>
          )}

          <View
            className="w-full rounded-xl p-3"
            style={{ backgroundColor: colors.warningDim }}
          >
            <Text className="text-xs text-center" style={{ color: colors.warning }}>
              New to Stellar wallets?{' '}
              <Text
                className="underline"
                onPress={() =>
                  Linking.openURL('https://stellar.org/learn/stellar-wallets')
                }
              >
                Learn more
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
