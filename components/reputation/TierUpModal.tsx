import React, { useEffect, useState } from 'react';
import { View, Text, Modal } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  Easing,
  withSequence,
} from 'react-native-reanimated';
import { Trophy, Check } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { Button } from '../shared/Button';

interface TierUpModalProps {
  isVisible: boolean;
  onClose: () => void;
  tier: string;
}

const Particle = ({ color, index }: { color: string; index: number }) => {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const angle = (index / 12) * Math.PI * 2 + Math.random() * 0.5;
    const distance = 80 + Math.random() * 80;
    
    x.value = withTiming(Math.cos(angle) * distance, { 
      duration: 1500, 
      easing: Easing.out(Easing.quad) 
    });
    y.value = withTiming(Math.sin(angle) * distance, { 
      duration: 1500, 
      easing: Easing.out(Easing.quad) 
    });
    scale.value = withSequence(
      withTiming(Math.random() * 1 + 0.5, { duration: 300 }), 
      withTiming(0, { duration: 1200 })
    );
    opacity.value = withTiming(0, { duration: 1500 });
  }, [index]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value }
    ],
    opacity: opacity.value,
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: color,
  }));

  return <Animated.View style={style} />;
};

export function TierUpModal({ isVisible, onClose, tier }: TierUpModalProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const [particles, setParticles] = useState<number[]>([]);

  useEffect(() => {
    if (isVisible) {
      scale.value = withSpring(1, { damping: 12 });
      opacity.value = withTiming(1, { duration: 400 });
      setParticles(Array.from({ length: 24 }).map((_, i) => i));
    } else {
      scale.value = 0;
      opacity.value = 0;
      setParticles([]);
    }
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const tierKey = tier.toLowerCase() as keyof typeof colors.tier;
  const tierColor = colors.tier[tierKey] || colors.brandGreen;

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View 
        className="flex-1 justify-center items-center px-6" 
        style={{ backgroundColor: 'rgba(8, 15, 26, 0.9)' }}
      >
        <Animated.View 
          style={[
            animatedStyle,
            { 
              backgroundColor: colors.surface, 
              borderRadius: 32, 
              borderWidth: 1, 
              borderColor: colors.borderSubtle,
              overflow: 'visible'
            }
          ]}
          className="w-full p-8 items-center"
        >
          {/* Particles */}
          <View className="absolute items-center justify-center" style={{ top: '30%', left: '50%' }}>
             {particles.map((i) => (
                <Particle key={i} index={i} color={i % 2 === 0 ? tierColor : colors.brandGreen} />
             ))}
          </View>

          <View 
            className="mb-6 h-24 w-24 rounded-full items-center justify-center shadow-lg" 
            style={{ backgroundColor: tierColor + '20', shadowColor: tierColor, shadowOpacity: 0.3, shadowRadius: 10 }}
          >
            <Trophy size={48} color={tierColor} />
          </View>

          <Text 
            className="text-3xl font-bold text-center mb-2" 
            style={{ color: colors.textPrimary }}
          >
            Tier Up!
          </Text>
          <Text 
            className="text-lg text-center mb-8" 
            style={{ color: colors.textSecondary }}
          >
            You've reached the <Text style={{ color: tierColor, fontWeight: 'bold' }}>{tier}</Text> tier.
          </Text>

          <View className="w-full gap-4 mb-10 bg-subtle/50 p-4 rounded-2xl" style={{ backgroundColor: colors.subtle + '30' }}>
            <View className="flex-row items-center gap-3">
              <View 
                className="h-6 w-6 rounded-full items-center justify-center" 
                style={{ backgroundColor: colors.success + '20' }}
              >
                <Check size={14} color={colors.success} />
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 15 }}>Lower interest rates unlocked</Text>
            </View>
            <View className="flex-row items-center gap-3">
              <View 
                className="h-6 w-6 rounded-full items-center justify-center" 
                style={{ backgroundColor: colors.success + '20' }}
              >
                <Check size={14} color={colors.success} />
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 15 }}>Higher credit limit available</Text>
            </View>
          </View>

          <Button 
            label="Awesome!" 
            onPress={onClose} 
            variant="primary" 
            className="w-full h-14" 
          />
        </Animated.View>
      </View>
    </Modal>
  );
}
