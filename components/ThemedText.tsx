import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme } from '@/lib/theme';

interface ThemedTextProps extends TextProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'accent' | 'error' | 'success' | 'warning';
  children: React.ReactNode;
}

export default function ThemedText({ 
  variant = 'primary', 
  style, 
  children, 
  ...props 
}: ThemedTextProps) {
  const { colors } = useTheme();

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return colors.text.primary;
      case 'secondary':
        return colors.text.secondary;
      case 'tertiary':
        return colors.text.tertiary;
      case 'inverse':
        return colors.text.inverse;
      case 'accent':
        return colors.primary[500];
      case 'error':
        return colors.semantic.error;
      case 'success':
        return colors.semantic.success;
      case 'warning':
        return colors.semantic.warning;
      default:
        return colors.text.primary;
    }
  };

  return (
    <Text
      style={[
        { color: getTextColor() },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}