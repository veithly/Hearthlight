import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/theme';

interface ThemedButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
}

export default function ThemedButton({ 
  variant = 'primary', 
  size = 'medium',
  style, 
  children, 
  disabled,
  ...props 
}: ThemedButtonProps) {
  const { colors, spacing } = useTheme();

  const getButtonStyle = () => {
    const baseStyle = {
      borderRadius: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
    };

    const sizeStyles = {
      small: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        minHeight: 32,
      },
      medium: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 44,
      },
      large: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        minHeight: 52,
      },
    };

    const variantStyles = {
      primary: {
        backgroundColor: disabled ? colors.neutral[300] : colors.primary[500],
      },
      secondary: {
        backgroundColor: disabled ? colors.neutral[200] : colors.surface,
        borderWidth: 1,
        borderColor: disabled ? colors.neutral[300] : colors.neutral[300],
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled ? colors.neutral[300] : colors.primary[500],
      },
      ghost: {
        backgroundColor: 'transparent',
      },
      danger: {
        backgroundColor: disabled ? colors.neutral[300] : colors.semantic.error,
      },
    };

    return [baseStyle, sizeStyles[size], variantStyles[variant]];
  };

  const getTextColor = () => {
    if (disabled) return colors.text.tertiary;
    
    switch (variant) {
      case 'primary':
      case 'danger':
        return colors.text.inverse;
      case 'secondary':
        return colors.text.primary;
      case 'outline':
        return colors.primary[500];
      case 'ghost':
        return colors.text.secondary;
      default:
        return colors.text.inverse;
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      disabled={disabled}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text style={[styles.buttonText, { color: getTextColor() }]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});