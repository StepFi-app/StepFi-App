import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { TrendingUp, ChevronRight } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useUserStore } from '../../stores/user.store';
import { useTranslation } from '../../hooks/useTranslation';

export function ReputationProgressWidget() {
  const { t } = useTranslation();
  const router = useRouter();
  const reputation = useUserStore((s) => s.reputation);

  if (!reputation) return null;

  const currentScore = reputation.score;
  const currentTier = reputation.tier.toLowerCase();
  
  const tierNames = t('tierNames', { returnObjects: true }) as string[];

  let nextTier = t('components.reputationWidget.maxTier');
  let nextThreshold = 100;
  
  if (currentTier === 'starter') {
    nextTier = tierNames[1] ?? 'Bronze';
    nextThreshold = 20;
  } else if (currentTier === 'bronze') {
    nextTier = tierNames[2] ?? 'Silver';
    nextThreshold = 50;
  } else if (currentTier === 'silver') {
    nextTier = tierNames[3] ?? 'Gold';
    nextThreshold = 80;
  } else if (currentTier === 'gold') {
    nextTier = t('components.reputationWidget.topTier');
    nextThreshold = 100;
  }

  const progress = Math.min(100, (currentScore / nextThreshold) * 100);

  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => router.push('/reputation')}
      className="rounded-2xl p-5 mb-8"
      style={{ 
        backgroundColor: colors.surface, 
        borderWidth: 1, 
        borderColor: colors.borderSubtle,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2
      }}
    >
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center gap-3">
          <View 
            className="h-10 w-10 rounded-xl items-center justify-center" 
            style={{ backgroundColor: colors.brandBlue + '15' }}
          >
            <TrendingUp size={20} color={colors.brandBlue} />
          </View>
          <View>
            <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
              {t('components.reputationWidget.reputation')}
            </Text>
            <Text className="text-xs" style={{ color: colors.textMuted }}>
              {t('components.reputationWidget.subtitle')}
            </Text>
          </View>
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </View>

      <View className="flex-row justify-between items-end mb-2.5">
        <View className="flex-row items-baseline gap-1">
          <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
            {currentScore}
          </Text>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            {t('components.reputationWidget.progressTo', { threshold: nextThreshold, tier: nextTier })}
          </Text>
        </View>
        <View 
          className="px-2.5 py-1 rounded-lg" 
          style={{ backgroundColor: colors.brandBlue + '10' }}
        >
          <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.brandBlue }}>
            {(tierNames[['starter', 'bronze', 'silver', 'gold'].indexOf(currentTier)] ?? reputation.tier)} {t('components.reputationWidget.tier')}
          </Text>
        </View>
      </View>

      <View className="h-2.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: colors.subtle }}>
        <View 
          className="h-full rounded-full" 
          style={{ backgroundColor: colors.brandBlue, width: `${progress}%` }} 
        />
      </View>
    </TouchableOpacity>
  );
}
