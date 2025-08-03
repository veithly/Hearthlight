import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/lib/theme';

interface GlassmorphismViewProps {
  children: React.ReactNode;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  style?: ViewStyle;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  backgroundColor?: string;
  shadowColor?: string;
  shadowOpacity?: number;
  shadowRadius?: number;
  shadowOffset?: { width: number; height: number };
  elevation?: number;
}

export default function GlassmorphismView({
  children,
  intensity = 20,
  tint = 'light',
  style,
  borderRadius = 16,
  borderWidth = 1,
  borderColor = 'rgba(255, 255, 255, 0.2)',
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  shadowColor = '#000',
  shadowOpacity = 0.1,
  shadowRadius = 10,
  shadowOffset = { width: 0, height: 4 },
  elevation = 5,
}: GlassmorphismViewProps) {
  const { colors } = useTheme();
  const glassmorphismStyle: ViewStyle = {
    borderRadius,
    borderWidth,
    borderColor,
    backgroundColor,
    shadowColor,
    shadowOpacity,
    shadowRadius,
    shadowOffset,
    elevation,
    overflow: 'hidden',
  };

  return (
    <View style={[glassmorphismStyle, style]}>
      <BlurView
        intensity={intensity}
        tint={tint}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    zIndex: 1,
  },
});
