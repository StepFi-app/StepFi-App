import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '../../constants/colors';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  disabled?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon: Icon,
  iconPosition = 'left',
  isLoading = false,
  disabled = false,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';
  const isDisabled = disabled || isLoading;

  const backgroundColor = isPrimary
    ? colors.cta
    : isDanger
      ? colors.errorDim
      : 'transparent';

  const textColor = isPrimary
    ? colors.ctaText
    : isDanger
      ? colors.error
      : isGhost
        ? colors.brandBlue
        : colors.textPrimary;

  const borderColor = isSecondary ? colors.border : 'transparent';

  return (
    <TouchableOpacity
      className="h-14 w-full rounded-2xl flex-row items-center justify-center gap-2"
      style={{
        backgroundColor,
        borderWidth: isSecondary ? 1 : 0,
        borderColor,
        opacity: isDisabled ? 0.5 : 1,
      }}
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {Icon && iconPosition === 'left' ? (
            <Icon size={20} color={textColor} />
          ) : null}
          <Text className="text-base font-semibold" style={{ color: textColor }}>
            {label}
          </Text>
          {Icon && iconPosition === 'right' ? (
            <Icon size={20} color={textColor} />
          ) : null}
        </>
      )}
    </TouchableOpacity>
  );
}
