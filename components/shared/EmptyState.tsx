import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '../../constants/colors';

interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: EmptyStateAction;
  iconColor?: string;
  iconBackgroundColor?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  iconColor = colors.brandBlue,
  iconBackgroundColor = colors.brandBlueDim,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <View
        className="h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: iconBackgroundColor }}>
        <Icon size={28} color={iconColor} />
      </View>
      <Text className="text-center text-lg font-semibold" style={{ color: colors.textPrimary }}>
        {title}
      </Text>
      <Text className="text-center text-sm" style={{ color: colors.textMuted }}>
        {message}
      </Text>
      {action ? (
        <TouchableOpacity
          className="mt-2 h-12 items-center justify-center rounded-2xl px-6"
          style={{ backgroundColor: colors.cta }}
          activeOpacity={0.8}
          onPress={action.onPress}>
          <Text className="text-sm font-semibold" style={{ color: colors.ctaText }}>
            {action.label}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
