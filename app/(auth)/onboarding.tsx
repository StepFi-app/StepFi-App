import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, GraduationCap, DollarSign, MapPin, CheckCircle2 } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { Button } from '../../components/shared/Button';
import { Input } from '../../components/shared/Input';
import { useTranslation } from '../../hooks/useTranslation';
import { useOnboarding } from '../../hooks/auth/use-onboarding';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const {
    currentStep,
    data,
    updateData,
    nextStep,
    prevStep,
    completeOnboarding,
    isStepValid,
    setCurrentStep,
  } = useOnboarding();

  useEffect(() => {
    flatListRef.current?.scrollToIndex({ index: currentStep, animated: true });
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep === 3) {
      completeOnboarding();
      return;
    }
    if (isStepValid(currentStep)) {
      nextStep();
    }
  };

  const steps = [
    {
      id: 0,
      title: t('onboarding.step1Title'),
      subtitle: t('onboarding.step1Subtitle'),
      icon: GraduationCap,
      render: () => (
        <View className="gap-4">
          <Input
            label={t('onboarding.programType')}
            placeholder={t('onboarding.programTypePlaceholder')}
            value={data.programType}
            onChangeText={(text) => updateData({ programType: text })}
          />
        </View>
      ),
    },
    {
      id: 1,
      title: t('onboarding.step2Title'),
      subtitle: t('onboarding.step2Subtitle'),
      icon: DollarSign,
      render: () => (
        <View className="gap-4">
          <Input
            label={t('onboarding.monthlyIncome')}
            placeholder={t('onboarding.monthlyIncomePlaceholder')}
            value={data.monthlyIncome}
            onChangeText={(text) => updateData({ monthlyIncome: text })}
            keyboardType="numeric"
          />
        </View>
      ),
    },
    {
      id: 2,
      title: t('onboarding.step3Title'),
      subtitle: t('onboarding.step3Subtitle'),
      icon: MapPin,
      render: () => (
        <View className="gap-4">
          <Input
            label={t('onboarding.country')}
            placeholder={t('onboarding.countryPlaceholder')}
            value={data.country}
            onChangeText={(text) => updateData({ country: text })}
          />
          <Input
            label={t('onboarding.city')}
            placeholder={t('onboarding.cityPlaceholder')}
            value={data.city}
            onChangeText={(text) => updateData({ city: text })}
          />
        </View>
      ),
    },
    {
      id: 3,
      title: t('onboarding.step4Title'),
      subtitle: t('onboarding.step4Subtitle'),
      icon: CheckCircle2,
      render: () => (
        <View className="items-center justify-center py-8">
          <View 
            className="w-20 h-20 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: colors.brandGreenDim }}
          >
            <CheckCircle2 size={40} color={colors.brandGreen} />
          </View>
          <Text 
            className="text-center text-[16px]"
            style={{ color: colors.textSecondary }}
          >
            {t('onboarding.step4Subtitle')}
          </Text>
        </View>
      ),
    },
  ];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 h-16 w-full z-50">
          <TouchableOpacity
            onPress={currentStep === 0 ? () => router.back() : prevStep}
            activeOpacity={0.7}
            className="flex items-center justify-center w-10 h-10 rounded-full"
          >
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View className="flex-row gap-2">
            {[0, 1, 2, 3].map((idx) => (
              <View
                key={idx}
                className="w-12 h-1 rounded-full"
                style={{
                  backgroundColor: idx <= currentStep ? colors.primary : colors.subtle,
                }}
              />
            ))}
          </View>

          <View className="w-10" />
        </View>

        <FlatList
          ref={flatListRef}
          data={steps}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={{ width }} className="px-4 pt-8">
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
              >
                <View className="mb-8">
                  <View 
                    className="w-12 h-12 rounded-xl items-center justify-center mb-4"
                    style={{ backgroundColor: colors.brandBlueDim }}
                  >
                    <item.icon size={24} color={colors.brandBlue} />
                  </View>
                  <Text className="text-[32px] font-bold mb-2" style={{ color: colors.textPrimary }}>
                    {item.title}
                  </Text>
                  <Text className="text-[16px]" style={{ color: colors.textSecondary }}>
                    {item.subtitle}
                  </Text>
                </View>
                {item.render()}
              </ScrollView>
            </View>
          )}
        />

        {/* Bottom Button */}
        <View 
          className="absolute bottom-0 left-0 w-full px-4 py-6"
          style={{ 
            backgroundColor: `${colors.background}E6`,
            borderTopWidth: 1,
            borderTopColor: colors.borderSubtle,
          }}
        >
          <Button
            label={currentStep === 3 ? t('onboarding.finish') : t('common.next')}
            onPress={handleNext}
            disabled={!isStepValid(currentStep)}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
