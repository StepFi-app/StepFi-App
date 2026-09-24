import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Puzzle,
  QrCode,
  CheckCircle,
  AlertCircle,
  LogOut,
  ChevronRight,
  ArrowRight,
  Wallet,
  Loader,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useWallet } from '../../hooks/useWallet';
import { ConnectModal } from '../../components/wallet/ConnectModal';

export default function SignInScreen() {
  const router = useRouter();
  const {
    address,
    isConnected,
    isConnecting,
    isSigning,
    error,
    connectFreighter,
    initLobstrConnection,
    disconnect,
    clearError,
  } = useWallet();

  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitializing(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleConnectFreighter = useCallback(async () => {
    clearError();
    try {
      await connectFreighter();
    } catch {
      // Error is set in store
    }
  }, [connectFreighter, clearError]);

  const handleConnectLobstr = useCallback(async () => {
    clearError();
    try {
      await initLobstrConnection();
    } catch {
      // Error is set in store
    }
  }, [initLobstrConnection, clearError]);

  const handleDisconnect = useCallback(async () => {
    await disconnect();
  }, [disconnect]);

  const handleContinue = useCallback(() => {
    router.push('/(auth)/register');
  }, [router]);

  if (isInitializing) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.background }}>
        <Loader size={28} color={colors.textMuted} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingBottom: 40,
        }}>
        <View className="flex-1 justify-center gap-8 pt-16">
          <View className="items-center gap-4">
            <View
              className="h-20 w-20 items-center justify-center rounded-2xl"
              style={{ backgroundColor: colors.brandBlueDim }}>
              <Wallet size={36} color={colors.brandBlue} />
            </View>
            <Text className="text-center text-3xl font-bold" style={{ color: colors.textPrimary }}>
              StepFi
            </Text>
            <Text className="px-4 text-center text-base" style={{ color: colors.textSecondary }}>
              Connect your Stellar wallet to access credit without banks
            </Text>
          </View>

          {error && (
            <View
              className="flex-row items-start gap-2 rounded-xl p-3"
              style={{ backgroundColor: colors.errorDim }}>
              <AlertCircle size={16} color={colors.error} />
              <Text className="flex-1 text-sm" style={{ color: colors.error }}>
                {error}
              </Text>
            </View>
          )}

          {isConnected && address ? (
            <View className="gap-5">
              <View
                className="items-center gap-4 rounded-2xl p-5"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}>
                <View
                  className="h-14 w-14 items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.successDim }}>
                  <CheckCircle size={28} color={colors.success} />
                </View>
                <Text className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                  Wallet Connected
                </Text>
                <Text
                  className="text-center font-mono text-sm"
                  style={{ color: colors.textSecondary }}>
                  {address.slice(0, 8)}...{address.slice(-6)}
                </Text>
              </View>

              <TouchableOpacity
                className="h-14 w-full flex-row items-center justify-center gap-2 rounded-2xl"
                style={{ backgroundColor: colors.cta }}
                activeOpacity={0.8}
                onPress={handleContinue}>
                <Text className="text-base font-semibold" style={{ color: colors.ctaText }}>
                  Continue
                </Text>
                <ChevronRight size={20} color={colors.ctaText} />
              </TouchableOpacity>

              <TouchableOpacity
                className="h-12 w-full flex-row items-center justify-center gap-2 rounded-2xl"
                style={{
                  backgroundColor: colors.subtle,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                activeOpacity={0.7}
                onPress={handleDisconnect}>
                <LogOut size={18} color={colors.textMuted} />
                <Text className="text-base" style={{ color: colors.textMuted }}>
                  Disconnect
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-4">
              <TouchableOpacity
                className="h-16 w-full flex-row items-center gap-4 rounded-2xl px-5"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1.5,
                  borderColor: colors.brandBlue,
                }}
                activeOpacity={0.8}
                onPress={handleConnectFreighter}
                disabled={isConnecting}>
                <View
                  className="h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: colors.brandBlueDim }}>
                  <Puzzle size={22} color={colors.brandBlue} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
                    Freighter
                  </Text>
                  <Text className="text-xs" style={{ color: colors.textMuted }}>
                    Browser extension wallet
                  </Text>
                </View>
                <ArrowRight size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                className="h-16 w-full flex-row items-center gap-4 rounded-2xl px-5"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1.5,
                  borderColor: colors.brandGreen,
                }}
                activeOpacity={0.8}
                onPress={handleConnectLobstr}
                disabled={isConnecting}>
                <View
                  className="h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: colors.brandGreenDim }}>
                  <QrCode size={22} color={colors.brandGreen} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
                    Lobstr
                  </Text>
                  <Text className="text-xs" style={{ color: colors.textMuted }}>
                    Mobile wallet — scan QR code
                  </Text>
                </View>
                <ArrowRight size={20} color={colors.textMuted} />
              </TouchableOpacity>

              {isConnecting && (
                <View
                  className="flex-row items-center justify-center gap-2 rounded-xl p-3"
                  style={{ backgroundColor: colors.brandBlueDim }}>
                  <Loader size={16} color={colors.brandBlue} />
                  <Text className="text-sm" style={{ color: colors.brandBlue }}>
                    Connecting to your wallet...
                  </Text>
                </View>
              )}

              <TouchableOpacity
                className="mt-2 flex-row items-center justify-center gap-1.5 py-4"
                activeOpacity={0.7}
                onPress={() => Linking.openURL('https://stellar.org/learn/stellar-wallets')}>
                <AlertCircle size={14} color={colors.textMuted} />
                <Text className="text-sm" style={{ color: colors.textMuted }}>
                  What is a Stellar wallet?
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <ConnectModal />
    </SafeAreaView>
  );
}
