import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Camera } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { Button } from '../../components/shared/Button';
import { Input } from '../../components/shared/Input';
import { useUserStore } from '../../stores/user.store';
import { useAuthStore } from '../../stores/auth.store';
import { useWalletStore } from '../../stores/wallet.store';
import { useTranslation } from '../../hooks/useTranslation';
import type { LearnerProfile } from '../../types/user.types';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const role = useUserStore((s) => s.role);
  const setProfile = useUserStore((s) => s.setProfile);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setWallet = useAuthStore((s) => s.setWallet);
  const publicKey = useWalletStore((s) => s.address);

  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Learner fields
  const [school, setSchool] = useState('');
  const [program, setProgram] = useState('');
  const [incomeType, setIncomeType] = useState('');

  // Sponsor fields
  const [organization, setOrganization] = useState('');
  const [investmentFocus, setInvestmentFocus] = useState('');

  const isLearner = role === 'learner';

  const isValid = isLearner
    ? displayName.trim().length > 0 && school.trim().length > 0
    : displayName.trim().length > 0 && organization.trim().length > 0;

  const handleComplete = async () => {
    if (!isValid) return;
    setIsSubmitting(true);

    try {
      const profile: LearnerProfile = {
        walletAddress: publicKey ?? '',
        displayName: displayName.trim(),
        role: role ?? 'learner',
        school: isLearner ? school.trim() : undefined,
        program: isLearner ? program.trim() : undefined,
        incomeType: isLearner ? incomeType.trim() : undefined,
        organization: !isLearner ? organization.trim() : undefined,
        investmentFocus: !isLearner ? investmentFocus.trim() : undefined,
      };

      setProfile(profile);

      await setTokens('mock-access-token', 'mock-refresh-token');
      await setWallet(publicKey ?? '');
    } catch {
      // Error handled — user stays on screen
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header with back button and progress bar */}
        <View className="z-50 h-16 w-full flex-row items-center justify-between px-4">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: 'transparent' }}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View className="flex-row gap-2">
            <View
              className="h-1 w-12 overflow-hidden rounded-full"
              style={{ backgroundColor: colors.subtle }}>
              <View className="h-full w-full" style={{ backgroundColor: colors.primary }} />
            </View>
            <View
              className="h-1 w-12 overflow-hidden rounded-full"
              style={{ backgroundColor: colors.subtle }}>
              <View className="h-full w-1/2" style={{ backgroundColor: colors.primary }} />
            </View>
            <View
              className="h-1 w-12 overflow-hidden rounded-full"
              style={{ backgroundColor: colors.subtle }}
            />
          </View>

          <View className="w-10" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled">
          <View className="mx-auto w-full max-w-md">
            {/* Headers */}
            <View className="mb-6">
              <Text className="mb-2 text-[32px] font-bold" style={{ color: colors.textPrimary }}>
                {t('auth.register.title')}
              </Text>
              <Text className="text-[16px]" style={{ color: colors.textSecondary }}>
                {t('auth.register.subtitleMatch', {
                  role: isLearner ? t('auth.register.sponsors') : t('auth.register.learners'),
                })}
              </Text>
            </View>

            <View className="flex-col gap-4">
              {/* Avatar Upload Area */}
              <View className="mb-4 mt-2 flex-col items-center justify-center">
                <TouchableOpacity
                  className="relative mb-2 h-24 w-24 items-center justify-center overflow-hidden rounded-full"
                  style={{
                    backgroundColor: colors.subtle,
                    borderWidth: 2,
                    borderColor: colors.borderSubtle,
                  }}
                  activeOpacity={0.8}>
                  <Camera size={32} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text className="text-[14px] font-semibold" style={{ color: colors.primary }}>
                    {t('auth.register.changePhoto')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Common field */}
              <Input
                label={t('auth.register.displayName')}
                placeholder={t('auth.register.displayNamePlaceholder')}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />

              {/* Role-specific fields */}
              {isLearner ? (
                <>
                  <Input
                    label={t('auth.register.school')}
                    placeholder={t('auth.register.schoolPlaceholder')}
                    value={school}
                    onChangeText={setSchool}
                  />
                  <Input
                    label={t('auth.register.program')}
                    placeholder={t('auth.register.programPlaceholder')}
                    value={program}
                    onChangeText={setProgram}
                  />
                  <Input
                    label={t('auth.register.incomeType')}
                    placeholder={t('auth.register.incomeTypePlaceholder')}
                    value={incomeType}
                    onChangeText={setIncomeType}
                  />
                </>
              ) : (
                <>
                  <Input
                    label={t('auth.register.organization')}
                    placeholder={t('auth.register.organizationPlaceholder')}
                    value={organization}
                    onChangeText={setOrganization}
                  />
                  <Input
                    label={t('auth.register.investmentFocus')}
                    placeholder={t('auth.register.investmentFocusPlaceholder')}
                    value={investmentFocus}
                    onChangeText={setInvestmentFocus}
                  />
                </>
              )}

              {/* Wallet address display */}
              <View className="mt-2 gap-1">
                <Text className="text-[14px]" style={{ color: colors.textSecondary }}>
                  {t('auth.register.walletAddress')}
                </Text>
                <View
                  className="h-12 justify-center rounded-xl px-4"
                  style={{
                    backgroundColor: colors.subtle,
                    borderWidth: 1,
                    borderColor: colors.borderSubtle,
                  }}>
                  <Text
                    className="text-[14px]"
                    style={{ color: colors.textMuted }}
                    numberOfLines={1}>
                    {publicKey
                      ? `${publicKey.slice(0, 8)}...${publicKey.slice(-8)}`
                      : t('auth.register.notConnected')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Fixed Action Area */}
        <View
          className="absolute bottom-0 left-0 w-full px-4 py-4"
          style={{
            backgroundColor: `${colors.background}E6`,
            borderTopWidth: 1,
            borderTopColor: colors.borderSubtle,
          }}>
          <View className="mx-auto w-full max-w-md">
            <TouchableOpacity
              className="w-full items-center justify-center rounded-xl py-4"
              style={{ backgroundColor: colors.primaryContainer, opacity: isValid ? 1 : 0.5 }}
              activeOpacity={0.8}
              onPress={handleComplete}
              disabled={!isValid || isSubmitting}>
              <Text className="text-[14px] font-bold" style={{ color: colors.background }}>
                {isSubmitting ? t('auth.register.saving') : t('auth.register.continue')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
