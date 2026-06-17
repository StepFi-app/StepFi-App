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
import { useWallet } from '../../hooks/useWallet';

function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatExpiry(expiry: number): string {
  const remaining = expiry * 1000 - Date.now();
  if (remaining <= 0) return 'Expired';
  const minutes = Math.floor(remaining / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function SessionStatus(): React.ReactElement {
  const {
    isConnected,
    publicKey,
    status,
    activeSession,
    needsReconnect,
    isInitializing,
    disconnect,
    retryConnection,
    sessions,
    switchWallet,
  } = useWallet();

  if (isInitializing) {
    return (
      <View className="flex-row items-center gap-2 rounded-xl bg-elevated px-4 py-3">
        <RefreshCw size={18} color={colors.textMuted} />
        <Text className="flex-1 text-sm text-textSecondary">
          Initializing wallet...
        </Text>
      </View>
    );
  }

  if (!isConnected || !activeSession) {
    if (needsReconnect) {
      return (
        <View className="flex-row items-center gap-2 rounded-xl bg-warningDim px-4 py-3">
          <AlertTriangle size={18} color={colors.warning} />
          <Text className="flex-1 text-sm text-warning">
            Session expired. Please reconnect your wallet.
          </Text>
          <TouchableOpacity
            className="rounded-lg bg-warning px-3 py-1.5"
            onPress={retryConnection}
          >
            <Text className="text-xs font-semibold text-background">
              Reconnect
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="flex-row items-center gap-2 rounded-xl bg-elevated px-4 py-3">
        <Wallet size={18} color={colors.textMuted} />
        <Text className="flex-1 text-sm text-textSecondary">
          Wallet not connected
        </Text>
      </View>
    );
  }

  const expiryTime = formatExpiry(activeSession.expiry);
  const isExpiringSoon = activeSession.expiry * 1000 - Date.now() < 5 * 60 * 1000;
  const statusColor = activeSession.isHealthy
    ? isExpiringSoon
      ? colors.warning
      : colors.success
    : colors.error;

  const StatusIcon = activeSession.isHealthy ? Wifi : WifiOff;

  return (
    <View className="rounded-xl bg-elevated px-4 py-3">
      <View className="flex-row items-center gap-2">
        <View
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
        <StatusIcon size={14} color={statusColor} />
        <View className="flex-1">
          <Text className="text-sm font-medium text-textPrimary">
            {activeSession.walletName}
          </Text>
          <Text className="text-xs text-textMuted font-mono">
            {publicKey
              ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}`
              : ''}
          </Text>
        </View>
        <View className="items-end">
          <Text
            className="text-xs"
            style={{ color: statusColor }}
          >
            {activeSession.isHealthy
              ? isExpiringSoon
                ? `Expires ${expiryTime}`
                : 'Connected'
              : 'Unreachable'}
          </Text>
          <Text className="text-xs text-textMuted">
            {formatTimeAgo(activeSession.connectedAt)}
          </Text>
        </View>
        <TouchableOpacity
          className="ml-2 rounded-lg bg-subtle p-2"
          onPress={() => disconnect(activeSession.topic)}
        >
          <LogOut size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {sessions.length > 1 && (
        <View className="mt-2 flex-row flex-wrap gap-1.5 border-t border-border pt-2">
          {sessions.map((session) => (
            <TouchableOpacity
              key={session.topic}
              className={`rounded-lg px-3 py-1 ${
                session.topic === activeSession.topic
                  ? 'bg-brandGreenDim'
                  : 'bg-subtle'
              }`}
              onPress={() => switchWallet(session.topic)}
            >
              <Text
                className={`text-xs ${
                  session.topic === activeSession.topic
                    ? 'text-brandGreen'
                    : 'text-textSecondary'
                }`}
              >
                {session.walletName}{' '}
                {session.isHealthy ? '\u25CF' : '\u25CB'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!activeSession.isHealthy && (
        <TouchableOpacity
          className="mt-2 flex-row items-center justify-center gap-1.5 rounded-lg bg-brandBlueDim py-2"
          onPress={retryConnection}
        >
          <RefreshCw size={14} color={colors.brandBlue} />
          <Text className="text-xs font-medium text-brandBlue">
            Attempt recovery
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
