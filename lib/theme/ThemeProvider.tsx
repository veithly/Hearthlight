import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { ThemeContextType, ThemeProviderProps, SpacingSystem, TypographySystem, AnimationConfig } from './types';
import { lightColors, darkColors } from './colors';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = '@hearthlight_theme';

// Design system constants
const spacing: SpacingSystem = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const typography: TypographySystem = {
  fontFamily: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semiBold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
    mono: 'FiraCode-Regular',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
};

const animations: AnimationConfig = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize theme from storage or system preference
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        // First, try to get saved theme preference from storage
        const savedTheme = await AsyncStorage.getItem(STORAGE_KEY);
        
        if (savedTheme === 'system' || savedTheme === null) {
          // Use system preference
          const systemColorScheme = Appearance.getColorScheme();
          setIsDarkMode(systemColorScheme === 'dark');
        } else {
          setIsDarkMode(savedTheme === 'dark');
        }
      } catch (error) {
        console.warn('Failed to initialize theme:', error);
        setIsDarkMode(false);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeTheme();

    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Auto-switch if user has system preference or no preference set
      AsyncStorage.getItem(STORAGE_KEY).then((savedTheme) => {
        if (savedTheme === 'system' || savedTheme === null) {
          setIsDarkMode(colorScheme === 'dark');
        }
      });
    });

    return () => subscription?.remove();
  }, []);

  const setDarkMode = async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, enabled ? 'dark' : 'light');
      setIsDarkMode(enabled);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const setSystemTheme = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'system');
      const systemColorScheme = Appearance.getColorScheme();
      setIsDarkMode(systemColorScheme === 'dark');
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!isDarkMode);
  };

  const colors = isDarkMode ? darkColors : lightColors;

  const contextValue: ThemeContextType = {
    colors,
    spacing,
    typography,
    animations,
    isDarkMode,
    toggleDarkMode,
    setDarkMode,
    setSystemTheme,
  };

  // Don't render children until theme is initialized
  if (!isInitialized) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}