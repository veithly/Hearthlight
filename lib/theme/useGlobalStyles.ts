import { useMemo } from 'react';
import { useTheme } from './ThemeProvider';
import { createGlobalStyles } from './globalStyles';

export function useGlobalStyles() {
  const { colors } = useTheme();
  
  const globalStyles = useMemo(() => createGlobalStyles(colors), [colors]);
  
  return globalStyles;
}