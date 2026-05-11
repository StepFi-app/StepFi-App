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
    <View className="flex-1 items-center justify-center px-8 gap-4">
      <View
        className="h-16 w-16 rounded-2xl items-center justify-center"
        style={{ backgroundColor: iconBackgroundColor }}
      >
        <Icon size={28} color={iconColor} />
      </View>
      <Text
        className="text-lg font-semibold text-center"
        style={{ color: colors.textPrimary }}
      >
        {title}
      </Text>
      <Text
        className="text-sm text-center"
        style={{ color: colors.textMuted }}
      >
        {message}
      </Text>
      {action ? (
        <TouchableOpacity
          className="h-12 px-6 rounded-2xl items-center justify-center mt-2"
          style={{ backgroundColor: colors.cta }}
          activeOpacity={0.8}
          onPress={action.onPress}
        >
          <Text
            className="text-sm font-semibold"
            style={{ color: colors.ctaText }}
          >
            {action.label}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
