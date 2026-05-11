import React from 'react';
import { View, Text, TextInput } from 'react-native';
import type { TextInputProps } from 'react-native';
import { colors } from '../../constants/colors';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
}

export function Input({ label, error, ...rest }: InputProps) {
  const borderColor = error ? colors.error : colors.border;

  return (
    <View className="gap-1">
      <Text className="text-sm" style={{ color: colors.textSecondary }}>
        {label}
      </Text>
      <TextInput
        className="h-12 rounded-xl px-4 text-base"
        style={{
          backgroundColor: colors.subtle,
          borderWidth: 1,
          borderColor,
          color: colors.textPrimary,
        }}
        placeholderTextColor={colors.textMuted}
        {...rest}
      />
      {error ? (
        <Text className="text-xs mt-1" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
