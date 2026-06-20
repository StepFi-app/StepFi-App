import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, LayoutChangeEvent, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Calculator, 
  Check, 
  AlertTriangle,
  Info,
  Save
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { Card } from '../../components/shared/Card';
import { Button } from '../../components/shared/Button';
import { useLoanSimulator, AffordabilityStatus } from '../../hooks/useLoanSimulator';
import { useUserStore } from '../../stores/user.store';

// Web-compatible Custom Slider using standard React Native PanResponder
interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onValueChange: (val: number) => void;
}

function CustomSlider({ min, max, step = 1, value, onValueChange }: SliderProps) {
  const [width, setWidth] = useState(0);
  const [localValue, setLocalValue] = useState(value);

  // Sync localValue with parent changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const valueRef = useRef(value);
  valueRef.current = value;

  const startValueRef = useRef(value);

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        startValueRef.current = valueRef.current;
        if (width > 0) {
          const locationX = evt.nativeEvent.locationX;
          const percentage = Math.max(0, Math.min(1, locationX / width));
          const targetVal = min + percentage * (max - min);
          
          setLocalValue(targetVal);

          const steppedVal = Math.round(targetVal / step) * step;
          const finalVal = Math.max(min, Math.min(max, steppedVal));
          if (finalVal !== valueRef.current) {
            onValueChange(finalVal);
          }
          startValueRef.current = targetVal;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (width === 0) return;
        const deltaVal = (gestureState.dx / width) * (max - min);
        const targetVal = Math.max(min, Math.min(max, startValueRef.current + deltaVal));
        
        setLocalValue(targetVal);

        const steppedVal = Math.round(targetVal / step) * step;
        const finalVal = Math.max(min, Math.min(max, steppedVal));
        if (finalVal !== valueRef.current) {
          onValueChange(finalVal);
        }
      },
    });
  }, [width, min, max, step, onValueChange]);

  const percentage = (localValue - min) / (max - min);

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
      style={{ height: 44, justifyContent: 'center', width: '100%', cursor: 'pointer' } as any}
    >
      {/* Background Track */}
      <View 
        style={{ height: 6, backgroundColor: colors.subtle, borderRadius: 3, width: '100%' }}
        pointerEvents="none"
      >
        <View 
          style={{ height: '100%', backgroundColor: colors.brandGreen, borderRadius: 3, width: `${percentage * 100}%` }} 
          pointerEvents="none"
        />
      </View>
      {/* Handle */}
      <View
        style={{
          position: 'absolute',
          left: `${percentage * 100}%`,
          marginLeft: -10,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: colors.textPrimary,
          borderWidth: 2,
          borderColor: colors.brandGreen,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 3,
        }}
        pointerEvents="none"
      />
    </View>
  );
}

export default function SimulateScreen() {
  const {
    income,
    setIncome,
    desiredLoanAmount,
    setDesiredLoanAmount,
    selectedTerm,
    setSelectedTerm,
    interestRate,
    repayments,
    activeStatus,
    saveSimulation,
  } = useLoanSimulator();

  const reputation = useUserStore((s) => s.reputation);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    saveSimulation();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const getHealthConfig = (status: AffordabilityStatus) => {
    switch (status) {
      case 'green':
        return {
          label: 'Healthy DTI',
          color: colors.success,
          bg: colors.successDim,
          advice: 'Monthly payment is below 15% of your income. Highly affordable.',
          icon: Check,
        };
      case 'amber':
        return {
          label: 'Moderate DTI',
          color: colors.warning,
          bg: colors.warningDim,
          advice: 'Monthly payment is 15% - 30% of your income. Manageable.',
          icon: Info,
        };
      case 'red':
        return {
          label: 'Strained DTI',
          color: colors.error,
          bg: colors.errorDim,
          advice: 'Monthly payment exceeds 30% of your income. High budget risk.',
          icon: AlertTriangle,
        };
    }
  };

  const activeHealth = getHealthConfig(activeStatus);
  const ActiveIcon = activeHealth.icon;

  const maxCredit = reputation?.maxCredit ?? 0;
  const isOverLimit = maxCredit > 0 && desiredLoanAmount > maxCredit;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* Header */}
        <View className="flex-row items-center gap-3 mt-2 mb-6">
          <View className="p-3 rounded-xl" style={{ backgroundColor: colors.brandGreenDim }}>
            <Calculator size={24} color={colors.brandGreen} />
          </View>
          <View className="flex-1">
            <Text className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
              Credit Simulator
            </Text>
            <Text className="text-xs" style={{ color: colors.textMuted }}>
              Estimate loan payments based on your interest rate ({interestRate}%)
            </Text>
          </View>
        </View>

        {/* Inputs */}
        <View className="gap-4 mb-6">
          {/* Income Slider */}
          <Card className="p-5 gap-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
                Monthly Income
              </Text>
              <Text className="text-xl font-bold" style={{ color: colors.brandGreen }}>
                ${income.toLocaleString()}
              </Text>
            </View>
            <CustomSlider
              min={1000}
              max={25000}
              step={250}
              value={income}
              onValueChange={setIncome}
            />
            <View className="flex-row justify-between">
              <Text className="text-[10px]" style={{ color: colors.textMuted }}>$1,000</Text>
              <Text className="text-[10px]" style={{ color: colors.textMuted }}>$25,000</Text>
            </View>
          </Card>

          {/* Loan Amount Slider */}
          <Card className="p-5 gap-3">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
                  Desired Loan Amount
                </Text>
                {maxCredit > 0 ? (
                  <Text className="text-[10px] mt-0.5" style={{ color: colors.textMuted }}>
                    Max credit limit: ${maxCredit.toLocaleString()}
                  </Text>
                ) : null}
              </View>
              <Text className="text-xl font-bold" style={{ color: colors.textPrimary }}>
                ${desiredLoanAmount.toLocaleString()}
              </Text>
            </View>
            <CustomSlider
              min={100}
              max={10000}
              step={100}
              value={desiredLoanAmount}
              onValueChange={setDesiredLoanAmount}
            />
            <View className="flex-row justify-between">
              <Text className="text-[10px]" style={{ color: colors.textMuted }}>$100</Text>
              <Text className="text-[10px]" style={{ color: colors.textMuted }}>$10,000</Text>
            </View>

            {isOverLimit ? (
              <View className="flex-row items-center gap-1.5 mt-1 rounded-lg p-2" style={{ backgroundColor: colors.warningDim }}>
                <AlertTriangle size={12} color={colors.warning} />
                <Text className="text-[10px] font-medium" style={{ color: colors.warning }}>
                  Simulated amount exceeds your credit limit of ${maxCredit.toLocaleString()}
                </Text>
              </View>
            ) : null}
          </Card>
        </View>

        {/* Affordability Status Badge */}
        <View 
          className="rounded-2xl p-4 flex-row items-start gap-3 mb-6 border"
          style={{ 
            backgroundColor: activeHealth.bg, 
            borderColor: activeHealth.color + '40'
          }}
        >
          <View className="p-2 rounded-full mt-0.5" style={{ backgroundColor: colors.background + '40' }}>
            <ActiveIcon size={16} color={activeHealth.color} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold" style={{ color: activeHealth.color }}>
              {activeHealth.label} ({Math.round(repayments[selectedTerm as 3 | 6 | 12].debtToIncomeRatio * 100)}% DTI)
            </Text>
            <Text className="text-xs mt-1 leading-4" style={{ color: colors.textPrimary }}>
              {activeHealth.advice}
            </Text>
          </View>
        </View>

        {/* Comparison Cards Section */}
        <Text className="text-lg font-bold mb-3" style={{ color: colors.textPrimary }}>
          Compare Terms
        </Text>
        <View className="flex-row flex-wrap gap-3 mb-6">
          {(Object.keys(repayments) as unknown as ('3' | '6' | '12')[]).map((termStr) => {
            const term = parseInt(termStr, 10);
            const data = repayments[term as 3 | 6 | 12];
            const isSelected = selectedTerm === term;
            const termHealth = getHealthConfig(data.status);
            
            return (
              <TouchableOpacity
                key={term}
                onPress={() => setSelectedTerm(term)}
                activeOpacity={0.8}
                className="flex-1 min-w-[200px] p-4 rounded-2xl border gap-3"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: isSelected ? colors.brandGreen : colors.borderSubtle,
                  borderWidth: isSelected ? 2 : 1,
                }}
              >
                {/* Header card info */}
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm font-bold" style={{ color: colors.textPrimary }}>
                    {term} Months
                  </Text>
                  <View 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: termHealth.color }}
                  />
                </View>

                {/* Main payment amount */}
                <View>
                  <Text className="text-xs" style={{ color: colors.textMuted }}>
                    Monthly Payment
                  </Text>
                  <Text className="text-lg font-bold mt-0.5" style={{ color: colors.textPrimary }}>
                    ${Math.round(data.monthlyRepayment).toLocaleString()}/mo
                  </Text>
                </View>

                {/* Additional metrics */}
                <View style={{ height: 1, backgroundColor: colors.borderSubtle }} />
                <View className="flex-row justify-between">
                  <View>
                    <Text className="text-[10px]" style={{ color: colors.textMuted }}>
                      Total Interest
                    </Text>
                    <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                      ${Math.round(data.totalInterest).toLocaleString()}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[10px]" style={{ color: colors.textMuted }}>
                      DTI Ratio
                    </Text>
                    <Text className="text-xs font-semibold" style={{ color: termHealth.color }}>
                      {Math.round(data.debtToIncomeRatio * 100)}%
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Save Simulation Action */}
        <Button
          label={isSaved ? "Simulation Saved" : "Save Simulation"}
          icon={isSaved ? Check : Save}
          onPress={handleSave}
          disabled={isSaved}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
