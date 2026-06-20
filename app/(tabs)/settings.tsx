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
  Globe,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { Card } from '../../components/shared/Card';
import { useAuthStore } from '../../stores/auth.store';
import { useUserStore } from '../../stores/user.store';
import { useWalletStore } from '../../stores/wallet.store';
import { biometricService } from '../../src/security/biometric.service';
import { useTranslation } from '../../hooks/useTranslation';

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

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
];

export default function SettingsScreen() {
  const { t, currentLanguage, changeLanguage } = useTranslation();
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

  const [languageModalVisible, setLanguageModalVisible] = useState(false);

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
    : t('settings.notConnected');

  const handleCopyAddress = () => {
    if (walletAddress) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      t('settings.signOutTitle'),
      t('settings.signOutMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.signOutConfirm'),
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
      setPinError(t('settings.pinErrorLength'));
      return;
    }
    if (pinStep === 'create') {
      setPinStep('confirm');
      setPinConfirm('');
      setPinError('');
    } else {
      if (pinInput !== pinConfirm) {
        setPinError(t('settings.pinErrorMatch'));
        return;
      }
      biometricService.setPin(pinInput).then(() => {
        setPinModalVisible(false);
        biometricService.setBiometricsEnabled(true).then(() => {
          setBiometricsEnabled(true);
        });
      });
    }
  }, [pinInput, pinConfirm, pinStep, t]);

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
          t('settings.disableBiometricTitle'),
          t('settings.disableBiometricMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('settings.disableBiometricConfirm'),
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
    [openPinSetup, t],
  );

  const currentLangLabel = LANGUAGES.find((l) => l.code === currentLanguage)?.label ?? LANGUAGES[0].label;

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
          {t('settings.settings')}
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
                {profile?.displayName ?? t('settings.defaultName')}
              </Text>
              <Text
                className="text-xs capitalize"
                style={{ color: colors.textMuted }}
              >
                {profile?.role ?? t('settings.defaultRole')} · {profile?.school ?? profile?.organization ?? ''}
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
          {t('settings.account')}
        </Text>
        <Card className="mb-6 px-4">
          <MenuItem
            icon={User}
            label={t('settings.editProfile')}
            subtitle={t('settings.editProfileSubtitle')}
            iconColor={colors.brandBlue}
            iconBg={colors.brandBlueDim}
            onPress={() => {}}
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <MenuItem
            icon={Bell}
            label={t('settings.notifications')}
            subtitle={t('settings.notificationsSubtitle')}
            iconColor={colors.warning}
            iconBg={colors.warningDim}
            onPress={() => {}}
          />
        </Card>

        {/* Language Section */}
        <Text
          className="text-xs font-semibold uppercase tracking-wide mb-2 ml-1"
          style={{ color: colors.textMuted }}
        >
          {t('settings.language')}
        </Text>
        <Card className="mb-6 px-4">
          <MenuItem
            icon={Globe}
            label={t('settings.language')}
            subtitle={currentLangLabel}
            iconColor={colors.brandGreen}
            iconBg={colors.brandGreenDim}
            onPress={() => setLanguageModalVisible(true)}
          />
        </Card>

        {/* Security Section */}
        <Text
          className="text-xs font-semibold uppercase tracking-wide mb-2 ml-1"
          style={{ color: colors.textMuted }}
        >
          {t('settings.security')}
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
                {t('settings.biometricLock')}
              </Text>
              <Text className="text-xs" style={{ color: colors.textMuted }}>
                {biometricsEnabled
                  ? t('settings.biometricActive')
                  : !biometricsAvailable
                    ? t('settings.biometricPinOnly')
                    : t('settings.biometricRequireAuth')}
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
          {t('settings.support')}
        </Text>
        <Card className="mb-6 px-4">
          <MenuItem
            icon={HelpCircle}
            label={t('settings.helpSupport')}
            subtitle={t('settings.helpSupportSubtitle')}
            iconColor={colors.brandGreen}
            iconBg={colors.brandGreenDim}
            onPress={() => {}}
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <MenuItem
            icon={Info}
            label={t('settings.aboutStepfi')}
            subtitle={t('settings.aboutStepfiSubtitle')}
            iconColor={colors.textSecondary}
            iconBg={colors.subtle}
            onPress={() => {}}
          />
        </Card>

        {/* Sign Out */}
        <Card className="px-4">
          <MenuItem
            icon={LogOut}
            label={t('settings.signOut')}
            subtitle={t('settings.signOutSubtitle')}
            onPress={handleSignOut}
            showChevron={false}
            danger
          />
        </Card>

        <Text
          className="text-xs text-center mt-6"
          style={{ color: colors.textFaint }}
        >
          {t('settings.versionLabel')}
        </Text>
      </ScrollView>

      {/* Language Picker Modal */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View
          className="flex-1 items-center justify-center px-8"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <View
            className="w-full rounded-2xl p-6 gap-2"
            style={{ backgroundColor: colors.surface }}
          >
            <Text
              className="text-xl font-bold text-center mb-4"
              style={{ color: colors.textPrimary }}
            >
              {t('settings.language')}
            </Text>
            {LANGUAGES.map((lang) => {
              const isActive = currentLanguage === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  className="flex-row items-center justify-between py-4 px-3 rounded-xl"
                  style={{ backgroundColor: isActive ? colors.subtle : 'transparent' }}
                  activeOpacity={0.7}
                  onPress={async () => {
                    await changeLanguage(lang.code);
                    setLanguageModalVisible(false);
                  }}
                >
                  <Text
                    className="text-base"
                    style={{ color: colors.textPrimary }}
                  >
                    {lang.label}
                  </Text>
                  {isActive ? (
                    <CheckCircle size={20} color={colors.brandGreen} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              className="py-4 items-center mt-2"
              onPress={() => setLanguageModalVisible(false)}
            >
              <Text
                className="text-sm"
                style={{ color: colors.textMuted }}
              >
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
              {pinStep === 'create' ? t('settings.setPin') : t('settings.confirmPin')}
            </Text>
            <Text
              className="text-sm text-center"
              style={{ color: colors.textSecondary }}
            >
              {pinStep === 'create'
                ? t('settings.setPinDescription')
                : t('settings.confirmPinDescription')}
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
              placeholder={pinStep === 'confirm' ? t('settings.pinPlaceholderReenter') : t('settings.pinPlaceholderEnter')}
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
                {pinStep === 'create' ? t('settings.pinNext') : t('settings.pinConfirmEnable')}
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
                {t('settings.pinCancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
