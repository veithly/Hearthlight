import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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
  gradientColors = [
    'rgba(139, 92, 246, 0.1)',
    'rgba(59, 130, 246, 0.1)',
    'rgba(16, 185, 129, 0.1)',
  ],
  gradientStart = { x: 0, y: 0 },
  gradientEnd = { x: 1, y: 1 },
  blurIntensity = 10,
  blurTint = 'light',
  showBlur = true,
}: GlassBackgroundProps) {
  return (
    <View style={[styles.container, style]}>
      {/* Gradient Background */}
      <LinearGradient
        colors={gradientColors}
        start={gradientStart}
        end={gradientEnd}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Blur Overlay */}
      {showBlur && (
        <BlurView
          intensity={blurIntensity}
          tint={blurTint}
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
