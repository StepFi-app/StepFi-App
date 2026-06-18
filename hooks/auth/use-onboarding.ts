import { useState, useCallback } from 'react';
import { useUserStore } from '../../stores/user.store';
import type { LearnerProfile } from '../../types/user.types';

export interface OnboardingData {
  programType: string;
  monthlyIncome: string;
  country: string;
  city: string;
}

export const useOnboarding = () => {
  const { profile, setProfile, setOnboardingComplete } = useUserStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    programType: profile?.programType || '',
    monthlyIncome: profile?.monthlyIncome?.toString() || '',
    country: profile?.country || '',
    city: profile?.city || '',
  });

  const updateData = useCallback((newData: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (!profile) return;

    const updatedProfile: LearnerProfile = {
      ...profile,
      programType: data.programType,
      monthlyIncome: parseFloat(data.monthlyIncome) || 0,
      country: data.country,
      city: data.city,
      onboardingComplete: true,
    };

    setProfile(updatedProfile);
    setOnboardingComplete(true);
  }, [data, profile, setProfile, setOnboardingComplete]);

  const isStepValid = useCallback((step: number) => {
    switch (step) {
      case 0:
        return data.programType.length > 0;
      case 1:
        return data.monthlyIncome.length > 0 && !isNaN(parseFloat(data.monthlyIncome));
      case 2:
        return data.country.length > 0 && data.city.length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  }, [data]);

  return {
    currentStep,
    data,
    updateData,
    nextStep,
    prevStep,
    completeOnboarding,
    isStepValid,
    setCurrentStep,
  };
};
