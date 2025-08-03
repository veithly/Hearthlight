import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '@/lib/theme';

interface ThemedViewProps extends ViewProps {
  variant?: 'background' | 'surface' | 'card' | 'transparent';
  children: React.ReactNode;
}

export default function ThemedView({ 
  variant = 'background', 
  style, 
  children, 
  ...props 
}: ThemedViewProps) {
  const { colors } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'background':
        return colors.background;
      case 'surface':
        return colors.surface;
      case 'card':
        return colors.surface;
      case 'transparent':
        return 'transparent';
      default:
        return colors.background;
    }
  };

  return (
    <View
      style={[
        { backgroundColor: getBackgroundColor() },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}