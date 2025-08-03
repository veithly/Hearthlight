import React from 'react';
import { TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/lib/theme';

interface GlassCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  borderRadius?: number;
  padding?: number;
  margin?: number;
  disabled?: boolean;
}

export default function GlassCard({
  children,
  onPress,
  style,
  intensity = 15,
  tint = 'light',
  borderRadius = 16,
  padding = 20,
  margin = 8,
  disabled = false,
}: GlassCardProps) {
  const { colors } = useTheme();
  const cardStyle: ViewStyle = {
    borderRadius,
    margin,
    overflow: 'hidden',
    backgroundColor: colors.surface + '20',
    borderWidth: 1,
    borderColor: colors.text.primary + '30',
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  };

  const contentStyle: ViewStyle = {
    padding,
    zIndex: 1,
  };

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={[cardStyle, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <BlurView
        intensity={intensity}
        tint={tint}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={contentStyle}>
        {children}
      </View>
    </Component>
  );
}
