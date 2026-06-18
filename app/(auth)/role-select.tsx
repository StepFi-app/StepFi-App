import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GraduationCap, TrendingUp, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useUserStore } from '../../stores/user.store';
import { useTranslation } from '../../hooks/useTranslation';
import type { UserRole } from '../../types/user.types';

interface RolePillProps {
  label: string;
}

function RolePill({ label }: RolePillProps) {
  return (
    <View
      className="rounded-full px-3 py-1"
      style={{ backgroundColor: colors.subtle }} // Using subtle as equivalent to surface-container
    >
      <Text className="text-[12px] font-semibold" style={{ color: colors.textSecondary }}>
        {label}
      </Text>
    </View>
  );
}

interface RoleCardProps {
  role: UserRole;
  title: string;
  subtitle: string;
  pills: string[];
  icon: typeof GraduationCap;
  iconColor: string;
  iconBg: string;
  borderColor: string;
  onPress: () => void;
}

function RoleCard({
  title,
  subtitle,
  pills,
  icon: Icon,
  iconColor,
  iconBg,
  borderColor,
  onPress,
}: RoleCardProps) {
  return (
    <TouchableOpacity
      className="w-full rounded-xl p-4 flex-col gap-4"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor,
      }}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View className="flex-row items-start gap-4">
        {/* Icon Circle */}
        <View
          className="h-12 w-12 rounded-full items-center justify-center flex-shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={24} color={iconColor} />
        </View>

        <View className="flex-1">
          {/* Top row — title, chevron */}
          <View className="flex-row items-center justify-between mb-1">
            <Text
              className="text-[24px] font-bold"
              style={{ color: colors.textPrimary }}
            >
              {title}
            </Text>
            <ChevronRight size={24} color={colors.textSecondary} />
          </View>

          {/* Description */}
          <Text
            className="text-[14px] leading-5 mb-4"
            style={{ color: colors.textSecondary }}
          >
            {subtitle}
          </Text>

          {/* Pills */}
          <View className="flex-row flex-wrap gap-2 mt-auto">
            {pills.map((pill) => (
              <RolePill key={pill} label={pill} />
            ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function RoleSelectScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setRole = useUserStore((s) => s.setRole);

  const handleSelect = (role: UserRole) => {
    setRole(role);
    router.push('/(auth)/register');
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-1 px-4 pt-4 pb-12 w-full max-w-2xl mx-auto">
        {/* Back button */}
        <View className="h-16 justify-center w-full mb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="h-10 w-10 rounded-full items-center justify-center"
            style={{ backgroundColor: 'transparent' }}
          >
            <ChevronLeft size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View className="gap-1 mb-6">
          <Text
            className="text-[32px] font-bold"
            style={{ color: colors.textPrimary }}
          >
            {t('auth.roleSelect.title')}
          </Text>
          <Text
            className="text-[16px]"
            style={{ color: colors.textSecondary }}
          >
            {t('auth.roleSelect.subtitle')}
          </Text>
        </View>

        {/* Role Cards */}
        <View className="flex-col gap-3">
          <RoleCard
            role="learner"
            title={t('auth.roleSelect.learnerTitle')}
            subtitle={t('auth.roleSelect.learnerSubtitle')}
            pills={[t('auth.roleSelect.learnerPill1'), t('auth.roleSelect.learnerPill2'), t('auth.roleSelect.learnerPill3')]}
            icon={GraduationCap}
            iconColor={colors.brandBlue}
            iconBg={colors.brandBlueDim}
            borderColor={colors.brandBlue}
            onPress={() => handleSelect('learner')}
          />

          <RoleCard
            role="sponsor"
            title={t('auth.roleSelect.sponsorTitle')}
            subtitle={t('auth.roleSelect.sponsorSubtitle')}
            pills={[t('auth.roleSelect.sponsorPill1'), t('auth.roleSelect.sponsorPill2'), t('auth.roleSelect.sponsorPill3')]}
            icon={TrendingUp}
            iconColor={colors.brandGreen}
            iconBg={colors.brandGreenDim}
            borderColor={colors.brandGreen}
            onPress={() => handleSelect('sponsor')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
