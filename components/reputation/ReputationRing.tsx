import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { colors } from '../../constants/colors';
import { useTranslation } from '../../hooks/useTranslation';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 128;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ReputationRingProps {
  score: number;
  tierColor: string;
}

/**
 * Animated tier-progress ring. The stroke sweeps from 0 to the score percentage
 * (clamped to 100) via `strokeDashoffset`, while the centered number counts up to
 * the raw score. Replaces the previous static bordered circle.
 */
export const ReputationRing = ({ score, tierColor }: ReputationRingProps) => {
  const { t } = useTranslation();
  const progress = useSharedValue(0);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    progress.value = withTiming(score, {
      duration: 1500,
      easing: Easing.out(Easing.quad),
    });
  }, [score, progress]);

  useDerivedValue(() => {
    runOnJS(setDisplayScore)(Math.floor(progress.value));
  });

  const animatedProps = useAnimatedProps(() => {
    const pct = Math.min(100, Math.max(0, progress.value));
    return { strokeDashoffset: CIRCUMFERENCE * (1 - pct / 100) };
  });

  return (
    <View className="h-32 w-32 items-center justify-center">
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={tierColor + '20'}
          strokeWidth={STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={tierColor}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <Text className="text-4xl font-bold" style={{ color: colors.textPrimary }}>
        {displayScore}
      </Text>
      <Text className="text-xs" style={{ color: colors.textMuted }}>
        {t('reputation.scoreOutOf')}
      </Text>
    </View>
  );
};
