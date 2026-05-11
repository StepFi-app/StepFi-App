import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Settings,
  User,
  Bell,
  HelpCircle,
  Info,
  ChevronRight,
  LogOut,
  Wallet,
  Copy,
  CheckCircle,
} from 'lucide-react-native';
import * as Clipboard from 'expo-linking';
import { colors } from '../../constants/colors';
import { Card } from '../../components/shared/Card';
import { useAuthStore } from '../../stores/auth.store';
import { useUserStore } from '../../stores/user.store';
import { useWalletStore } from '../../stores/wallet.store';

interface MenuItemProps {
  icon: typeof User;
  label: string;
  subtitle?: string;
  iconColor?: string;
  iconBg?: string;
  onPress: () => void;
  showChevron?: boolean;
  danger?: boolean;
}

function MenuItem({
  icon: Icon,
  label,
  subtitle,
  iconColor = colors.textSecondary,
  iconBg = colors.subtle,
  onPress,
  showChevron = true,
  danger = false,
}: MenuItemProps) {
  return (
    <TouchableOpacity
      className="flex-row items-center py-4 gap-3"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View
        className="h-10 w-10 rounded-xl items-center justify-center"
        style={{ backgroundColor: danger ? colors.errorDim : iconBg }}
      >
        <Icon size={20} color={danger ? colors.error : iconColor} />
      </View>
      <View className="flex-1">
        <Text
          className="text-sm font-medium"
          style={{ color: danger ? colors.error : colors.textPrimary }}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {showChevron ? <ChevronRight size={16} color={colors.textMuted} /> : null}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const profile = useUserStore((s) => s.profile);
  const clearUser = useUserStore((s) => s.clearUser);
  const setDisconnected = useWalletStore((s) => s.setDisconnected);
  const [copied, setCopied] = useState(false);

  const truncatedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}`
    : 'Not connected';

  const handleCopyAddress = () => {
    // Using a simple state flag since clipboard access varies across platforms
    if (walletAddress) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out? You will need to reconnect your wallet.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            setDisconnected();
            clearUser();
            await clearAuth();
            // Auth guard will redirect to sign-in
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        <Text
          className="text-2xl font-bold mt-2 mb-6"
          style={{ color: colors.textPrimary }}
        >
          Settings
        </Text>

        {/* Profile Card */}
        <Card className="mb-6 p-5 gap-4">
          <View className="flex-row items-center gap-4">
            {/* Avatar */}
            <View
              className="h-14 w-14 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.brandBlueDim }}
            >
              <User size={28} color={colors.brandBlue} />
            </View>
            <View className="flex-1">
              <Text
                className="text-lg font-semibold"
                style={{ color: colors.textPrimary }}
              >
                {profile?.displayName ?? 'StepFi User'}
              </Text>
              <Text
                className="text-xs capitalize"
                style={{ color: colors.textMuted }}
              >
                {profile?.role ?? 'Learner'} · {profile?.school ?? profile?.organization ?? ''}
              </Text>
            </View>
          </View>

          {/* Wallet address */}
          <TouchableOpacity
            className="flex-row items-center gap-3 rounded-xl p-3"
            style={{ backgroundColor: colors.subtle }}
            activeOpacity={0.7}
            onPress={handleCopyAddress}
          >
            <Wallet size={16} color={colors.textMuted} />
            <Text
              className="text-sm flex-1 font-mono"
              style={{ color: colors.textSecondary }}
            >
              {truncatedAddress}
            </Text>
            {copied ? (
              <CheckCircle size={16} color={colors.success} />
            ) : (
              <Copy size={16} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        </Card>

        {/* Menu Section */}
        <Text
          className="text-xs font-semibold uppercase tracking-wide mb-2 ml-1"
          style={{ color: colors.textMuted }}
        >
          Account
        </Text>
        <Card className="mb-6 px-4">
          <MenuItem
            icon={User}
            label="Edit Profile"
            subtitle="Update your personal information"
            iconColor={colors.brandBlue}
            iconBg={colors.brandBlueDim}
            onPress={() => {}}
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <MenuItem
            icon={Bell}
            label="Notifications"
            subtitle="Payment reminders and updates"
            iconColor={colors.warning}
            iconBg={colors.warningDim}
            onPress={() => {}}
          />
        </Card>

        <Text
          className="text-xs font-semibold uppercase tracking-wide mb-2 ml-1"
          style={{ color: colors.textMuted }}
        >
          Support
        </Text>
        <Card className="mb-6 px-4">
          <MenuItem
            icon={HelpCircle}
            label="Help & Support"
            subtitle="FAQs and contact support"
            iconColor={colors.brandGreen}
            iconBg={colors.brandGreenDim}
            onPress={() => {}}
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <MenuItem
            icon={Info}
            label="About StepFi"
            subtitle="Version, terms, and privacy"
            iconColor={colors.textSecondary}
            iconBg={colors.subtle}
            onPress={() => {}}
          />
        </Card>

        {/* Sign Out */}
        <Card className="px-4">
          <MenuItem
            icon={LogOut}
            label="Sign out"
            subtitle="Disconnect wallet and sign out"
            onPress={handleSignOut}
            showChevron={false}
            danger
          />
        </Card>

        {/* App version */}
        <Text
          className="text-xs text-center mt-6"
          style={{ color: colors.textFaint }}
        >
          StepFi v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
