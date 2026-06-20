import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  Wallet,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  LogOut,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useWalletStore } from '../../stores/wallet.store';

export function SessionStatus(): React.ReactElement {
  const address = useWalletStore((s) => s.address);
  const isConnected = useWalletStore((s) => s.isConnected);
  const walletType = useWalletStore((s) => s.walletType);
  const disconnect = useWalletStore((s) => s.disconnect);

  if (!isConnected || !address) {
    return (
      <View
        className="flex-row items-center gap-2 rounded-xl px-4 py-3"
        style={{ backgroundColor: colors.elevated }}
      >
        <Wallet size={18} color={colors.textMuted} />
        <Text
          className="flex-1 text-sm"
          style={{ color: colors.textSecondary }}
        >
          Wallet not connected
        </Text>
      </View>
    );
  }

  return (
    <View
      className="rounded-xl px-4 py-3"
      style={{ backgroundColor: colors.elevated }}
    >
      <View className="flex-row items-center gap-2">
        <View
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: colors.success }}
        />
        <Wifi size={14} color={colors.success} />
        <View className="flex-1">
          <Text
            className="text-sm font-medium"
            style={{ color: colors.textPrimary }}
          >
            {walletType === 'freighter' ? 'Freighter' : 'Lobstr'}
          </Text>
          <Text
            className="text-xs font-mono"
            style={{ color: colors.textMuted }}
          >
            {`${address.slice(0, 6)}...${address.slice(-4)}`}
          </Text>
        </View>
        <TouchableOpacity
          className="ml-2 rounded-lg p-2"
          style={{ backgroundColor: colors.subtle }}
          onPress={() => disconnect()}
        >
          <LogOut size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
