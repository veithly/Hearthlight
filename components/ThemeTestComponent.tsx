import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';

export default function ThemeTestComponent() {
  const { colors, isDarkMode } = useTheme();
  const { t, locale } = useI18n();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text.primary }]}>
        Theme Test
      </Text>
      <Text style={[styles.text, { color: colors.text.secondary }]}>
        Current theme: {isDarkMode ? 'Dark' : 'Light'}
      </Text>
      <Text style={[styles.text, { color: colors.text.secondary }]}>
        Current language: {locale}
      </Text>
      <Text style={[styles.text, { color: colors.text.secondary }]}>
        Background: {colors.background}
      </Text>
      <Text style={[styles.text, { color: colors.text.secondary }]}>
        Primary: {colors.primary[500]}
      </Text>
      <Text style={[styles.text, { color: colors.text.secondary }]}>
        Test translation: {t('common.save')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    marginBottom: 4,
  },
});