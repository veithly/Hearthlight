import { StyleSheet } from 'react-native';
import { ColorPalette } from './types';

export const createGlobalStyles = (colors: ColorPalette) => StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  surface: {
    backgroundColor: colors.surface,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Text styles
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  body: {
    fontSize: 16,
    color: colors.text.primary,
  },
  caption: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  small: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  
  // Button styles
  primaryButton: {
    backgroundColor: colors.primary[500],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  
  // Input styles
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  inputFocused: {
    borderColor: colors.primary[500],
  },
  
  // Layout styles
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  column: {
    flexDirection: 'column',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Spacing
  marginXS: { margin: 4 },
  marginSM: { margin: 8 },
  marginMD: { margin: 16 },
  marginLG: { margin: 24 },
  marginXL: { margin: 32 },
  
  paddingXS: { padding: 4 },
  paddingSM: { padding: 8 },
  paddingMD: { padding: 16 },
  paddingLG: { padding: 24 },
  paddingXL: { padding: 32 },
  
  // Borders
  border: {
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  borderRadius: {
    borderRadius: 12,
  },
  
  // Shadows
  shadow: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Glassmorphism
  glass: {
    backgroundColor: colors.glassmorphism.background,
    borderWidth: 1,
    borderColor: colors.glassmorphism.border,
  },
});