import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/lib/theme';

interface GlassBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
  gradientColors?: string[];
  gradientStart?: { x: number; y: number };
  gradientEnd?: { x: number; y: number };
  blurIntensity?: number;
  blurTint?: 'light' | 'dark' | 'default';
  showBlur?: boolean;
}

export default function GlassBackground({
  children,
  style,
  gradientColors,
  gradientStart = { x: 0, y: 0 },
  gradientEnd = { x: 1, y: 1 },
  blurIntensity = 10,
  blurTint,
  showBlur = true,
}: GlassBackgroundProps) {
  const { colors, isDarkMode } = useTheme();
  
  // Use theme-aware defaults
  const defaultGradientColors = gradientColors || [
    colors.background,
    colors.glassmorphism.background,
    colors.background,
  ];
  
  const defaultBlurTint = blurTint || (isDarkMode ? 'dark' : 'light');
  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      {/* Gradient Background */}
      <LinearGradient
        colors={defaultGradientColors}
        start={gradientStart}
        end={gradientEnd}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Blur Overlay */}
      {showBlur && (
        <BlurView
          intensity={blurIntensity}
          tint={defaultBlurTint}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      
      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});
