import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useDerivedValue, 
  withTiming, 
  Easing, 
  runOnJS 
} from 'react-native-reanimated';
import {
  Star,
  AlertCircle,
  TrendingUp,
  Shield,
  Clock,
  CheckCircle,
  Info,
  UserCheck,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { Card } from '../../components/shared/Card';
import { EmptyState } from '../../components/shared/EmptyState';
import { useUserStore } from '../../stores/user.store';
import { useAuthStore } from '../../stores/auth.store';
import { reputationService } from '../../services/reputation.service';
import { useReputationMilestones } from '../../hooks/useReputationMilestones';
import { useVouch } from '../../hooks/useVouch';
import { useTranslation } from '../../hooks/useTranslation';
import { TransactionStatus } from '../../types/transaction.types';
import { TierUpModal } from '../../components/reputation/TierUpModal';
import { MilestoneModal } from '../../components/reputation/MilestoneModal';

interface TipItem {
  icon: typeof CheckCircle;
  text: string;
  color: string;
  key: string;
}

function getTierDescription(tier: string, t: (key: string, opts?: any) => string): string {
  switch (tier.toLowerCase()) {
    case 'gold':
      return t('reputation.descGold');
    case 'silver':
      return t('reputation.descSilver');
    case 'bronze':
      return t('reputation.descBronze');
    case 'starter':
      return t('reputation.descStarter');
    default:
      return t('reputation.descDefault');
  }
}

const AnimatedScore = ({ score }: { score: number }) => {
  const animatedValue = useSharedValue(0);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    animatedValue.value = withTiming(score, {
      duration: 1500,
      easing: Easing.out(Easing.quad),
    });
  }, [score, animatedValue]);

  useDerivedValue(() => {
    runOnJS(setDisplayScore)(Math.floor(animatedValue.value));
  });

  return (
    <Text
      className="text-4xl font-bold"
      style={{ color: colors.textPrimary }}
    >
      {displayScore}
    </Text>
  );
};

export default function ReputationScreen() {
  const { t } = useTranslation();
  const reputation = useUserStore((s) => s.reputation);
  const setReputation = useUserStore((s) => s.setReputation);
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const IMPROVEMENT_TIPS: TipItem[] = [
    { icon: CheckCircle, text: t('reputation.tip1'), color: colors.success, key: 'tip1' },
    { icon: Clock, text: t('reputation.tip2'), color: colors.warning, key: 'tip2' },
    { icon: Shield, text: t('reputation.tip3'), color: colors.brandBlue, key: 'tip3' },
    { icon: TrendingUp, text: t('reputation.tip4'), color: colors.brandGreen, key: 'tip4' },
  ];

  const {
    showTierUp,
    newTier,
    closeTierUp,
    showMilestone,
    milestoneType,
    closeMilestone,
  } = useReputationMilestones();

  const {
    status: vouchStatus,
    txHash: vouchTxHash,
    error: vouchError,
    submitVouch,
    reset: resetVouch,
  } = useVouch();

  const isVouching =
    vouchStatus === TransactionStatus.SIGNING ||
    vouchStatus === TransactionStatus.BROADCASTING;

  const handleVouch = useCallback(() => {
    void submitVouch({
      mentorWallet: walletAddress ?? '',
      learnerWallet: walletAddress ?? '',
      amount: 100,
    });
  }, [walletAddress, submitVouch]);

  const fetchReputation = useCallback(async () => {
    if (!walletAddress) {
      setIsLoading(false);
      return;
    }
    setError(null);
    try {
      const data = await reputationService.getScore(walletAddress);
      setReputation(data);
    } catch {
      setError(t('common.somethingWentWrong'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [walletAddress, setReputation]);

  useEffect(() => {
    void fetchReputation();
  }, [fetchReputation]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    void fetchReputation();
  };

  // Error state
  if (error && !isRefreshing && !isLoading) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        <EmptyState
          icon={AlertCircle}
          title={t('common.somethingWentWrong')}
          message={error ?? ''}
          iconColor={colors.error}
          iconBackgroundColor={colors.errorDim}
          action={{ label: t('common.tryAgain'), onPress: () => { setIsLoading(true); void fetchReputation(); } }}
        />
      </SafeAreaView>
    );
  }

  // Empty / no data state
  if (!isLoading && !reputation) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        <EmptyState
          icon={Star}
          title={t('reputation.noReputationData')}
          message={t('reputation.noReputationMessage')}
          iconColor={colors.tier.gold}
          iconBackgroundColor={colors.warningDim}
        />
      </SafeAreaView>
    );
  }

  const tierColor =
    reputation?.tier && reputation.tier.toLowerCase() in colors.tier
      ? colors.tier[reputation.tier.toLowerCase() as keyof typeof colors.tier]
      : colors.textMuted;

  const scorePercent = reputation ? Math.min(100, reputation.score) : 0;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brandGreen}
          />
        }
      >
        <Text
          className="text-2xl font-bold mt-2 mb-6"
          style={{ color: colors.textPrimary }}
        >
          {t('reputation.reputationScore')}
        </Text>

        {/* Main score card */}
        <Card className="mb-4 p-6 items-center gap-4">
          {/* Score circle */}
          <View
            className="h-32 w-32 rounded-full items-center justify-center"
            style={{
              borderWidth: 4,
              borderColor: tierColor + '40',
              backgroundColor: tierColor + '10',
            }}
          >
            <AnimatedScore score={reputation?.score ?? 0} />
            <Text className="text-xs" style={{ color: colors.textMuted }}>
              {t('reputation.scoreOutOf')}
            </Text>
          </View>

          {/* Tier badge */}
          <View
            className="rounded-xl px-4 py-2"
            style={{ backgroundColor: tierColor + '20' }}
          >
            <Text
              className="text-sm font-semibold capitalize"
              style={{ color: tierColor }}
            >
              {reputation?.tier ?? t('reputation.tierStarter')} {t('reputation.tier')}
            </Text>
          </View>

          {/* Tier description */}
          <Text
            className="text-sm text-center leading-5"
            style={{ color: colors.textMuted }}
          >
            {getTierDescription(reputation?.tier ?? 'starter', t)}
          </Text>

          {/* Score progress bar */}
          <View className="w-full gap-1">
            <View className="flex-row justify-between">
              <Text className="text-xs" style={{ color: colors.textMuted }}>
                0
              </Text>
              <Text className="text-xs" style={{ color: colors.textMuted }}>
                100
              </Text>
            </View>
            <View
              className="h-3 rounded-full w-full"
              style={{ backgroundColor: colors.subtle }}
            >
              <View
                className="h-3 rounded-full"
                style={{
                  backgroundColor: tierColor,
                  width: `${scorePercent}%`,
                }}
              />
            </View>
          </View>
        </Card>

        {/* Details row */}
        <View className="flex-row gap-3 mb-4">
          <Card className="flex-1 p-4 items-center gap-1">
            <Text className="text-xs" style={{ color: colors.textMuted }}>
              {t('reputation.interestRate')}
            </Text>
            <Text
              className="text-xl font-bold"
              style={{ color: colors.textPrimary }}
            >
              {reputation?.interestRate ?? '—'}%
            </Text>
            <View className="flex-row items-center gap-1 mt-1">
              <Info size={10} color={colors.textFaint} />
              <Text className="text-xs" style={{ color: colors.textFaint }}>
                {t('reputation.basedOnTier')}
              </Text>
            </View>
          </Card>
          <Card className="flex-1 p-4 items-center gap-1">
            <Text className="text-xs" style={{ color: colors.textMuted }}>
              {t('reputation.maxCredit')}
            </Text>
            <Text
              className="text-xl font-bold"
              style={{ color: colors.textPrimary }}
            >
              ${reputation?.maxCredit?.toLocaleString() ?? '—'}
            </Text>
            <View className="flex-row items-center gap-1 mt-1">
              <Info size={10} color={colors.textFaint} />
              <Text className="text-xs" style={{ color: colors.textFaint }}>
                {t('reputation.yourCreditLimit')}
              </Text>
            </View>
          </Card>
        </View>

        {/* How to improve */}
        <Text
          className="text-lg font-semibold mt-2 mb-3"
          style={{ color: colors.textPrimary }}
        >
          {t('reputation.howToImprove')}
        </Text>

        <Card className="p-4 gap-4">
          {IMPROVEMENT_TIPS.map((tip) => (
            <View key={tip.key} className="flex-row items-start gap-3">
              <View
                className="h-8 w-8 rounded-full items-center justify-center mt-0.5"
                style={{ backgroundColor: tip.color + '20' }}
              >
                <tip.icon size={16} color={tip.color} />
              </View>
              <Text
                className="text-sm flex-1 leading-5"
                style={{ color: colors.textSecondary }}
              >
                {tip.text}
              </Text>
            </View>
          ))}
        </Card>

        {/* Vouch Section */}
        <Text
          className="text-lg font-semibold mt-6 mb-3"
          style={{ color: colors.textPrimary }}
        >
          {t('reputation.getVouched')}
        </Text>
        <Card className="p-4 gap-3">
          <View className="flex-row items-start gap-3">
            <View
              className="h-8 w-8 rounded-full items-center justify-center mt-0.5"
              style={{ backgroundColor: colors.brandBlue + '20' }}
            >
              <UserCheck size={16} color={colors.brandBlue} />
            </View>
            <Text className="text-sm flex-1 leading-5" style={{ color: colors.textSecondary }}>
              {t('reputation.vouchDescription')}
            </Text>
          </View>

          {vouchStatus === TransactionStatus.ERROR && vouchError && (
            <View className="rounded-xl bg-red-50 p-3">
              <View className="flex-row items-start gap-2">
                <AlertCircle size={16} color="#DC2626" />
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-red-700">{t('reputation.vouchFailed')}</Text>
                  <Text className="text-xs text-red-600 mt-0.5">{vouchError.message}</Text>
                  <TouchableOpacity onPress={resetVouch} className="mt-1">
                    <Text className="text-xs font-semibold text-red-700 underline">{t('common.dismiss')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {vouchStatus === TransactionStatus.SUCCESS && vouchTxHash && (
            <View className="rounded-xl bg-green-50 p-3">
              <View className="flex-row items-start gap-2">
                <CheckCircle size={16} color="#16A34A" />
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-green-700">{t('reputation.vouchSubmitted')}</Text>
                  <Text className="text-xs text-green-600 mt-0.5 font-mono">
                    {t('reputation.txLabel')} {vouchTxHash.slice(0, 16)}...
                  </Text>
                  <TouchableOpacity onPress={resetVouch} className="mt-1">
                    <Text className="text-xs font-semibold text-green-700 underline">{t('common.dismiss')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity
            className={`items-center rounded-xl py-3 ${isVouching ? 'bg-cta' : 'bg-ctaStrong'}`}
            onPress={handleVouch}
            disabled={isVouching}
          >
            {isVouching ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text className="text-sm font-semibold text-white">{t('reputation.submittingVouch')}</Text>
              </View>
            ) : (
              <Text className="text-sm font-semibold text-white">{t('reputation.requestVouch')}</Text>
            )}
          </TouchableOpacity>
        </Card>
      </ScrollView>

      {/* Celebrations */}
      <TierUpModal 
        isVisible={showTierUp} 
        onClose={closeTierUp} 
        tier={newTier ?? ''} 
      />
      <MilestoneModal 
        isVisible={showMilestone} 
        onClose={closeMilestone} 
        milestone={milestoneType ?? ''} 
      />
    </SafeAreaView>
  );
}
