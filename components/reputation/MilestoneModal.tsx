import React, { useEffect } from 'react';
import { View, Text, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Star } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { Button } from '../shared/Button';

interface MilestoneModalProps {
  isVisible: boolean;
  onClose: () => void;
  milestone: string;
}

export function MilestoneModal({ isVisible, onClose, milestone }: MilestoneModalProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      scale.value = withSpring(1, { damping: 15 });
      opacity.value = withTiming(1, { duration: 400 });
    } else {
      scale.value = 0;
      opacity.value = 0;
    }
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Modal transparent visible={isVisible} animationType="none" onRequestClose={onClose}>
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(8, 15, 26, 0.85)' }}>
        <Animated.View
          style={[
            animatedStyle,
            {
              backgroundColor: colors.surface,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
            },
          ]}
          className="w-full items-center p-8">
          <View
            className="mb-6 h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.brandBlue + '20' }}>
            <Star size={40} color={colors.brandBlue} fill={colors.brandBlue} />
          </View>

          <Text
            className="mb-2 text-center text-2xl font-bold"
            style={{ color: colors.textPrimary }}>
            Milestone Reached!
          </Text>
          <Text className="mb-8 text-center text-base" style={{ color: colors.textSecondary }}>
            Congratulations on reaching{' '}
            <Text style={{ color: colors.brandBlue, fontWeight: 'bold' }}>{milestone}</Text>!
          </Text>

          <Button label="Keep it up!" onPress={onClose} variant="primary" className="h-12 w-full" />
        </Animated.View>
      </View>
    </Modal>
  );
}
