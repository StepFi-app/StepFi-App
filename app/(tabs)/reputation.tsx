import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
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
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { Card } from '../../components/shared/Card';
import { EmptyState } from '../../components/shared/EmptyState';
import { useUserStore } from '../../stores/user.store';
import { useAuthStore } from '../../stores/auth.store';
import { reputationService } from '../../services/reputation.service';
import { useReputationMilestones } from '../../hooks/useReputationMilestones';
import { TierUpModal } from '../../components/reputation/TierUpModal';
import { MilestoneModal } from '../../components/reputation/MilestoneModal';

interface TipItem {
  icon: typeof CheckCircle;
  text: string;
  color: string;
}

const IMPROVEMENT_TIPS: TipItem[] = [
  {
    icon: CheckCircle,
    text: 'Pay installments on time to increase your score',
    color: colors.success,
  },
  {
    icon: Clock,
    text: 'Avoid late payments — each one reduces your score',
    color: colors.warning,
  },
  {
    icon: Shield,
    text: 'Get vouched by a mentor to boost your credit limit',
    color: colors.brandBlue,
  },
  {
    icon: TrendingUp,
    text: 'Complete more loans to build a strong payment history',
    color: colors.brandGreen,
  },
];

function getTierDescription(tier: string): string {
  switch (tier.toLowerCase()) {
    case 'gold':
      return 'Excellent trust — lowest interest rates and highest credit limits.';
    case 'silver':
      return 'Good trust — competitive rates and solid credit limits.';
    case 'bronze':
      return 'Growing trust — moderate rates. Keep paying on time!';
    case 'starter':
      return 'Just getting started — build trust with your first loan.';
    default:
      return 'Build your trust score by using StepFi.';
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
  const reputation = useUserStore((s) => s.reputation);
  const setReputation = useUserStore((s) => s.setReputation);
  const walletAddress = useAuthStore((s) => s.walletAddress);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    showTierUp,
    newTier,
    closeTierUp,
    showMilestone,
    milestoneType,
    closeMilestone,
  } = useReputationMilestones();

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
      setError('Could not load your reputation score. Please try again.');
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
          title="Something went wrong"
          message={error}
          iconColor={colors.error}
          iconBackgroundColor={colors.errorDim}
          action={{ label: 'Try again', onPress: () => { setIsLoading(true); void fetchReputation(); } }}
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
          title="No reputation data"
          message="Your trust score will appear here after your first loan activity."
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
          Reputation Score
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
              / 100
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
              {reputation?.tier ?? 'Starter'} Tier
            </Text>
          </View>

          {/* Tier description */}
          <Text
            className="text-sm text-center leading-5"
            style={{ color: colors.textMuted }}
          >
            {getTierDescription(reputation?.tier ?? 'starter')}
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
              Interest rate
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
                Based on your tier
              </Text>
            </View>
          </Card>
          <Card className="flex-1 p-4 items-center gap-1">
            <Text className="text-xs" style={{ color: colors.textMuted }}>
              Max credit
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
                Your credit limit
              </Text>
            </View>
          </Card>
        </View>

        {/* How to improve */}
        <Text
          className="text-lg font-semibold mt-2 mb-3"
          style={{ color: colors.textPrimary }}
        >
          How to improve your score
        </Text>

        <Card className="p-4 gap-4">
          {IMPROVEMENT_TIPS.map((tip) => (
            <View key={tip.text} className="flex-row items-start gap-3">
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
