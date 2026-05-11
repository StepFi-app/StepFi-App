import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';
import { colors } from '../../constants/colors';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className = '', style, ...rest }: CardProps) {
  return (
    <View
      className={`rounded-2xl p-4 ${className}`}
      style={[
        {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
