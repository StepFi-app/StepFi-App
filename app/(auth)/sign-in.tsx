import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  Wallet,
  CreditCard,
  TrendingUp,
  Monitor,
  BookOpen,
  HelpCircle,
  ChevronLeft,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useWalletStore } from '../../stores/wallet.store';
import { useTranslation } from '../../hooks/useTranslation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_SLIDES = 4;

/* ─── Pagination Dots ─── */
function PaginationDots({ activeIndex, onDotPress }: { activeIndex: number; onDotPress: (index: number) => void }) {
  return (
    <View className="flex-row items-center justify-center gap-2 mb-4">
      {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => onDotPress(i)}
          activeOpacity={0.8}
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: i === activeIndex ? colors.primary : 'transparent',
            borderWidth: i === activeIndex ? 0 : 1,
            borderColor: i === activeIndex ? 'transparent' : colors.borderSubtle,
          }}
        />
      ))}
    </View>
  );
}

/* ─── Feature Row (Slide 2) ─── */
interface FeatureRowProps {
  icon: typeof Wallet;
  text: string;
  iconColor: string;
  iconBg: string;
}

function FeatureRow({ icon: Icon, text, iconColor, iconBg }: FeatureRowProps) {
  return (
    <View
      className="flex-row items-center gap-4 rounded-2xl p-4"
      style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle }}
    >
      <View
        className="h-10 w-10 rounded-xl items-center justify-center"
        style={{ backgroundColor: iconBg }}
      >
        <Icon size={20} color={iconColor} />
      </View>
      <Text className="text-sm flex-1" style={{ color: colors.textSecondary }}>
        {text}
      </Text>
    </View>
  );
}

/* ─── Tier Card (Slide 3) ─── */
interface TierCardProps {
  name: string;
  scoreRange: string;
  rate: string;
  maxCredit: string;
  barColor: string;
  isHighlighted?: boolean;
}

function TierCard({ name, scoreRange, rate, maxCredit, barColor, isHighlighted = false }: TierCardProps) {
  const { t } = useTranslation();
  return (
    <View
      className="flex-1 rounded-2xl p-4 gap-3"
      style={{
        backgroundColor: colors.surface,
        borderWidth: isHighlighted ? 1.5 : 1,
        borderColor: isHighlighted ? barColor : colors.borderSubtle,
      }}
    >
      <View className="flex-row items-center gap-1">
        <Text
          className="text-xs font-bold uppercase tracking-wide"
          style={{ color: isHighlighted ? barColor : colors.textPrimary }}
        >
          {name}
        </Text>
        <TrendingUp size={12} color={isHighlighted ? barColor : colors.textMuted} />
      </View>
      <View
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: barColor,
          width: '70%',
        }}
      />
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs" style={{ color: colors.textMuted }}>{t('auth.signIn.score')}</Text>
          <Text className="text-xs font-bold" style={{ color: colors.textPrimary }}>{scoreRange}</Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-xs" style={{ color: colors.textMuted }}>{t('auth.signIn.rate')}</Text>
          <Text className="text-xs font-bold" style={{ color: colors.textPrimary }}>{rate}</Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-xs" style={{ color: colors.textMuted }}>{t('auth.signIn.max')}</Text>
          <Text
            className="text-xs font-bold"
            style={{ color: isHighlighted ? barColor : colors.primaryContainer }}
          >
            {maxCredit}
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ─── Main Component ─── */
export default function SignInScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const setConnected = useWalletStore((s) => s.setConnected);
  const tierNames = t('tierNames', { returnObjects: true }) as string[];

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  const goToSlide = (index: number) => {
    if (index >= 0 && index < TOTAL_SLIDES) {
      scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    }
  };

  const goToNextSlide = () => {
    goToSlide(activeIndex + 1);
  };

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setConnected('GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
      router.push('/(auth)/role-select');
    } catch {
      // Handle error implicitly
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 relative" style={{ backgroundColor: colors.background }}>
      {/* Absolute Back Button for Steps 2-4 */}
      {activeIndex > 0 && (
        <View className="absolute top-14 left-4 z-50">
          <TouchableOpacity
            onPress={() => goToSlide(activeIndex - 1)}
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: 'transparent' }}
          >
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {/* ─── SLIDE 1: Welcome ─── */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 px-4 justify-between pb-8 pt-12">
          <View className="flex-col items-center text-center mt-12 gap-3">
            <Text className="text-[40px] font-bold" style={{ color: colors.primary }}>{t('auth.signIn.stepfi')}</Text>
            <View className="mt-6 items-center">
              <Text className="text-[32px] font-bold text-center mb-1" style={{ color: colors.textPrimary }}>
                {t('auth.signIn.stepIntoFuture')}
              </Text>
              <Text className="text-[18px] text-center" style={{ color: colors.textSecondary }}>
                {t('auth.signIn.creditWithoutBanks')}
              </Text>
            </View>
          </View>

          <View className="h-[40%] w-full flex items-center justify-center my-6 overflow-hidden">
            <Image 
              source={require('../../assets/images/staircase.png')}
              style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
            />
          </View>

          <View className="w-full flex-col gap-3 pb-8">
            <PaginationDots activeIndex={0} onDotPress={goToSlide} />

            <TouchableOpacity
              className="w-full py-4 rounded-[16px] items-center justify-center flex-row gap-2"
              style={{ backgroundColor: colors.primaryContainer }}
              activeOpacity={0.8}
              onPress={goToNextSlide}
            >
              <Text className="text-[18px] font-bold" style={{ color: colors.background }}>
                {t('common.next')}
              </Text>
              <ArrowRight size={20} color={colors.background} />
            </TouchableOpacity>

            <TouchableOpacity
              className="w-full py-4 rounded-[16px] flex-row justify-center items-center"
              activeOpacity={0.7}
              onPress={handleConnectWallet}
            >
              <Text className="text-[16px]" style={{ color: colors.textSecondary }}>
                {t('auth.signIn.alreadyHaveAccount')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── SLIDE 2: Features ─── */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 px-4 justify-between pb-8 pt-12">
          <View className="flex-1 gap-6">
              <Text
                className="text-[32px] font-bold text-center leading-10 mt-12"
                style={{ color: colors.textPrimary }}
              >
                {t('auth.signIn.financeWhatYouNeed')}
              </Text>

            <View
              className="rounded-2xl p-6 items-center justify-center my-6"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, height: 200 }}
            >
              <View className="flex-row items-center gap-4">
                <View
                  className="h-24 w-24 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: colors.brandGreenDim, borderWidth: 1, borderColor: colors.brandGreen + '30' }}
                >
                  <BookOpen size={32} color={colors.brandGreen} />
                </View>
                <View
                  className="h-24 w-24 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: colors.brandBlueDim, borderWidth: 1, borderColor: colors.brandBlue + '30' }}
                >
                  <Monitor size={32} color={colors.brandBlue} />
                </View>
              </View>
            </View>

            <View className="gap-3">
              <FeatureRow
                icon={Wallet}
                text={t('auth.signIn.signInWithWallet')}
                iconColor={colors.brandBlue}
                iconBg={colors.brandBlueDim}
              />
              <FeatureRow
                icon={CreditCard}
                text={t('auth.signIn.financeLaptops')}
                iconColor={colors.primaryContainer}
                iconBg={colors.brandGreenDim}
              />
              <FeatureRow
                icon={TrendingUp}
                text={t('auth.signIn.repayInstallments')}
                iconColor={colors.textMuted}
                iconBg={colors.subtle}
              />
            </View>
          </View>

          <View className="gap-3 pb-8 mt-4">
            <PaginationDots activeIndex={1} onDotPress={goToSlide} />
            <TouchableOpacity
              className="w-full py-4 rounded-[16px] items-center justify-center flex-row gap-2"
              style={{ backgroundColor: colors.primaryContainer }}
              activeOpacity={0.8}
              onPress={goToNextSlide}
            >
              <Text className="text-[18px] font-bold" style={{ color: colors.background }}>
                {t('common.next')}
              </Text>
              <ArrowRight size={20} color={colors.background} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── SLIDE 3: Reputation Tiers ─── */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 px-4 justify-between pb-8 pt-12">
          <View className="flex-1 gap-5">
              <Text
                className="text-[32px] font-bold text-center mt-12 mb-6"
                style={{ color: colors.textPrimary }}
              >
                {t('auth.signIn.yourScoreYourTerms')}
              </Text>

            <View className="gap-3">
              <View className="flex-row gap-3">
                <TierCard
                  name={tierNames[0]}
                  scoreRange="0-59"
                  rate="10%"
                  maxCredit="$1K"
                  barColor={colors.tier.starter}
                />
                <TierCard
                  name={tierNames[1]}
                  scoreRange="60-74"
                  rate="8%"
                  maxCredit="$2.5K"
                  barColor={colors.tier.bronze}
                />
              </View>
              <View className="flex-row gap-3">
                <TierCard
                  name={tierNames[2]}
                  scoreRange="75-89"
                  rate="6%"
                  maxCredit="$5K"
                  barColor={colors.tier.silver}
                />
                <TierCard
                  name={tierNames[3]}
                  scoreRange="90-100"
                  rate="4%"
                  maxCredit="$10K"
                  barColor={colors.tier.gold}
                  isHighlighted
                />
              </View>
            </View>

            <Text
              className="text-[14px] text-center mt-6"
              style={{ color: colors.textMuted }}
            >
              {t('auth.signIn.payOnTime')}
            </Text>
          </View>

          <View className="gap-3 pb-8">
            <PaginationDots activeIndex={2} onDotPress={goToSlide} />
            <TouchableOpacity
              className="w-full py-4 rounded-[16px] items-center justify-center flex-row gap-2"
              style={{ backgroundColor: colors.primaryContainer }}
              activeOpacity={0.8}
              onPress={goToNextSlide}
            >
              <Text className="text-[18px] font-bold" style={{ color: colors.background }}>
                {t('common.next')}
              </Text>
              <ArrowRight size={20} color={colors.background} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── SLIDE 4: Connect Wallet ─── */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 px-4 justify-between pb-8 pt-12">
          <View className="flex-1 justify-center items-center gap-6 mt-12">
            <View
              className="h-28 w-28 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.brandBlueDim }}
            >
              <View
                className="h-20 w-20 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.brandBlue + '30' }}
              >
                <Wallet size={36} color={colors.brandBlue} />
              </View>
            </View>

            <Text
              className="text-[32px] font-bold text-center mt-6 mb-2"
              style={{ color: colors.textPrimary }}
            >
              {t('auth.signIn.connectYourWallet')}
            </Text>
            
            <View className="gap-4 items-center px-4">
              <Text
                className="text-[16px] text-center"
                style={{ color: colors.textSecondary }}
              >
                {t('auth.signIn.noPasswords')}
              </Text>
              <View className="flex-row items-center justify-center gap-4 mt-2">
                <View className="px-3 py-1 rounded-full border" style={{ borderColor: colors.borderSubtle, backgroundColor: colors.surface }}>
                  <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>{t('auth.signIn.walletLobstr')}</Text>
                </View>
                <View className="px-3 py-1 rounded-full border" style={{ borderColor: colors.borderSubtle, backgroundColor: colors.surface }}>
                  <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>{t('auth.signIn.walletXbull')}</Text>
                </View>
              </View>
            </View>
          </View>

          <View className="w-full gap-3 pb-8">
            <PaginationDots activeIndex={3} onDotPress={goToSlide} />

            <TouchableOpacity
              className="w-full py-4 rounded-[16px] flex-row items-center justify-center gap-2"
              style={{ backgroundColor: colors.primaryContainer, opacity: isConnecting ? 0.6 : 1 }}
              activeOpacity={0.8}
              onPress={handleConnectWallet}
              disabled={isConnecting}
            >
              <Wallet size={20} color={colors.background} />
              <Text className="text-[18px] font-bold" style={{ color: colors.background }}>
                {isConnecting ? t('auth.signIn.connecting') : t('auth.signIn.connectStellarWallet')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 py-4"
              activeOpacity={0.7}
              onPress={() => Linking.openURL('https://stellar.org/learn/stellar-wallets')}
            >
              <HelpCircle size={14} color={colors.textMuted} />
              <Text className="text-[14px]" style={{ color: colors.textMuted }}>
                {t('auth.signIn.dontHaveWallet')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
