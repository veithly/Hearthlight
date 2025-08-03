'use client';

import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/lib/theme';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import * as SplashScreen from 'expo-splash-screen';

export function ClientRootLayout({ children }: { children: React.ReactNode }) {
  const { isDarkMode } = useTheme();
  useFrameworkReady();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      {children}
      <StatusBar style={isDarkMode ? "light" : "dark"} />
    </>
  );
}