import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';

export default function SimpleThemeTest() {
  const { colors, isDarkMode, toggleDarkMode } = useTheme();
  const { t, locale, setLocale } = useI18n();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Theme & Language Test
        </Text>
        
        <Text style={[styles.text, { color: colors.text.secondary }]}>
          Current Theme: {isDarkMode ? 'Dark' : 'Light'}
        </Text>
        
        <Text style={[styles.text, { color: colors.text.secondary }]}>
          Current Language: {locale}
        </Text>
        
        <Text style={[styles.text, { color: colors.text.secondary }]}>
          Background: {colors.background}
        </Text>
        
        <Text style={[styles.text, { color: colors.text.secondary }]}>
          Surface: {colors.surface}
        </Text>
        
        <Text style={[styles.text, { color: colors.text.secondary }]}>
          Primary: {colors.primary[500]}
        </Text>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary[500] }]}
          onPress={toggleDarkMode}
        >
          <Text style={[styles.buttonText, { color: colors.text.inverse }]}>
            Toggle Theme
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.accent[500] }]}
          onPress={() => setLocale(locale === 'en' ? 'zh-CN' : 'en')}
        >
          <Text style={[styles.buttonText, { color: colors.text.inverse }]}>
            Switch Language
          </Text>
        </TouchableOpacity>
        
        <Text style={[styles.text, { color: colors.text.secondary }]}>
          Translation Test: {t('common.save')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  text: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});