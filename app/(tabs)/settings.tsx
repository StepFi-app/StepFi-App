import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Bell,
  HelpCircle,
  Info,
  ChevronRight,
  LogOut,
  Wallet,
  Copy,
  CheckCircle,
  Fingerprint,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { Card } from '../../components/shared/Card';
import { useAuthStore } from '../../stores/auth.store';
import { useUserStore } from '../../stores/user.store';
import { useWalletStore } from '../../stores/wallet.store';
import { biometricService } from '../../src/security/biometric.service';

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
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const profile = useUserStore((s) => s.profile);
  const clearUser = useUserStore((s) => s.clearUser);
  const setDisconnected = useWalletStore((s) => s.setDisconnected);
  const [copied, setCopied] = useState(false);

  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    async function loadState() {
      const enabled = await biometricService.isBiometricsEnabled();
      const { isAvailable, isEnrolled } =
        await biometricService.checkBiometricAvailability();
      setBiometricsEnabled(enabled);
      setBiometricsAvailable(isAvailable && isEnrolled);
    }
    loadState();
  }, []);

  const truncatedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}`
    : 'Not connected';

  const handleCopyAddress = () => {
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
          },
        },
      ],
    );
  };

  const openPinSetup = useCallback(() => {
    setPinInput('');
    setPinConfirm('');
    setPinStep('create');
    setPinError('');
    setPinModalVisible(true);
  }, []);

  const handlePinSetupNext = useCallback(() => {
    if (pinInput.length < 4 || pinInput.length > 6) {
      setPinError('PIN must be 4-6 digits');
      return;
    }
    if (pinStep === 'create') {
      setPinStep('confirm');
      setPinConfirm('');
      setPinError('');
    } else {
      if (pinInput !== pinConfirm) {
        setPinError('PINs do not match');
        return;
      }
      biometricService.setPin(pinInput).then(() => {
        setPinModalVisible(false);
        biometricService.setBiometricsEnabled(true).then(() => {
          setBiometricsEnabled(true);
        });
      });
    }
  }, [pinInput, pinConfirm, pinStep]);

  const handleToggleBiometrics = useCallback(
    async (value: boolean) => {
      if (value) {
        const { isAvailable, isEnrolled } =
          await biometricService.checkBiometricAvailability();
        if (!isAvailable || !isEnrolled) {
          const hasExistingPin = await biometricService.hasPin();
          if (hasExistingPin) {
            await biometricService.setBiometricsEnabled(true);
            setBiometricsEnabled(true);
          } else {
            openPinSetup();
          }
          return;
        }

        const result = await biometricService.authenticateBiometric();
        if (result.success) {
          const hasExistingPin = await biometricService.hasPin();
          if (!hasExistingPin) {
            openPinSetup();
          } else {
            await biometricService.setBiometricsEnabled(true);
            setBiometricsEnabled(true);
          }
        }
      } else {
        Alert.alert(
          'Disable biometric lock',
          'Are you sure? Your PIN will also be removed.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                await biometricService.disableBiometrics();
                setBiometricsEnabled(false);
              },
            },
          ],
        );
      }
    },
    [openPinSetup],
  );

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

        {/* Account Section */}
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

        {/* Security Section */}
        <Text
          className="text-xs font-semibold uppercase tracking-wide mb-2 ml-1"
          style={{ color: colors.textMuted }}
        >
          Security
        </Text>
        <Card className="mb-6 px-4">
          <View className="flex-row items-center py-4 gap-3">
            <View
              className="h-10 w-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: colors.brandBlueDim }}
            >
              <Fingerprint size={20} color={colors.brandBlue} />
            </View>
            <View className="flex-1">
              <Text
                className="text-sm font-medium"
                style={{ color: colors.textPrimary }}
              >
                Biometric Lock
              </Text>
              <Text className="text-xs" style={{ color: colors.textMuted }}>
                {biometricsEnabled
                  ? 'Lock screen is active'
                  : !biometricsAvailable
                    ? 'PIN-only mode'
                    : 'Require authentication to open app'}
              </Text>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={handleToggleBiometrics}
              trackColor={{ false: colors.subtle, true: colors.primaryContainer }}
              thumbColor={biometricsEnabled ? colors.primary : colors.textMuted}
            />
          </View>
        </Card>

        {/* Support Section */}
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

        <Text
          className="text-xs text-center mt-6"
          style={{ color: colors.textFaint }}
        >
          StepFi v1.0.0
        </Text>
      </ScrollView>

      {/* PIN Setup Modal */}
      <Modal
        visible={pinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPinModalVisible(false)}
      >
        <View
          className="flex-1 items-center justify-center px-8"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <View
            className="w-full rounded-2xl p-6 gap-5"
            style={{ backgroundColor: colors.surface }}
          >
            <Text
              className="text-xl font-bold text-center"
              style={{ color: colors.textPrimary }}
            >
              {pinStep === 'create' ? 'Set PIN' : 'Confirm PIN'}
            </Text>
            <Text
              className="text-sm text-center"
              style={{ color: colors.textSecondary }}
            >
              {pinStep === 'create'
                ? 'Enter a 4-6 digit PIN for fallback access'
                : 'Re-enter your PIN to confirm'}
            </Text>

            {pinError ? (
              <Text
                className="text-sm text-center"
                style={{ color: colors.error }}
              >
                {pinError}
              </Text>
            ) : null}

            <TextInput
              className="w-full text-center text-2xl tracking-widest rounded-xl px-4 py-3"
              style={{
                color: colors.textPrimary,
                backgroundColor: colors.subtle,
                borderWidth: 1,
                borderColor: colors.borderSubtle,
              }}
              placeholder={pinStep === 'confirm' ? 'Re-enter PIN' : 'Enter PIN'}
              placeholderTextColor={colors.textMuted}
              value={pinStep === 'create' ? pinInput : pinConfirm}
              onChangeText={pinStep === 'create' ? setPinInput : setPinConfirm}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              autoFocus
            />

            <TouchableOpacity
              className="w-full py-4 rounded-xl items-center justify-center"
              style={{
                backgroundColor: colors.primaryContainer,
                opacity:
                  (pinStep === 'create' ? pinInput : pinConfirm).length >= 4
                    ? 1
                    : 0.5,
              }}
              activeOpacity={0.8}
              onPress={handlePinSetupNext}
              disabled={
                (pinStep === 'create' ? pinInput : pinConfirm).length < 4
              }
            >
              <Text
                className="text-base font-bold"
                style={{ color: colors.background }}
              >
                {pinStep === 'create' ? 'Next' : 'Confirm & Enable'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="py-2 items-center"
              onPress={() => {
                setPinModalVisible(false);
                setBiometricsEnabled(false);
              }}
            >
              <Text
                className="text-sm"
                style={{ color: colors.textMuted }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
