import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Settings as SettingsIcon } from 'lucide-react-native';
import { useTheme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import LanguageSelector from './LanguageSelector';
import ThemeToggle from './ThemeToggle';

interface SettingsSectionProps {
  style?: any;
}

export default function SettingsSection({ style }: SettingsSectionProps) {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <ScrollView style={[styles.container, style]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <SettingsIcon size={24} color={colors.primary[500]} />
        <Text style={[styles.title, { color: colors.text.primary }]}>
          {t('settings.general')}
        </Text>
      </View>

      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          {t('settings.appearance')}
        </Text>
        <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
          <LanguageSelector />
          <ThemeToggle />
        </View>
      </View>

      {/* Accessibility Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          {t('settings.accessibility')}
        </Text>
        <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.settingItem, { borderBottomColor: colors.neutral[200] }]}>
            <Text style={[styles.settingLabel, { color: colors.text.primary }]}>
              Reduce Motion
            </Text>
            <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>
              Minimize animations and transitions
            </Text>
          </View>
          <View style={[styles.settingItem, { borderBottomColor: colors.neutral[200] }]}>
            <Text style={[styles.settingLabel, { color: colors.text.primary }]}>
              High Contrast
            </Text>
            <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>
              Increase color contrast for better visibility
            </Text>
          </View>
        </View>
      </View>

      {/* Data & Privacy Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          {t('settings.data')}
        </Text>
        <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.settingItem, { borderBottomColor: colors.neutral[200] }]}>
            <Text style={[styles.settingLabel, { color: colors.text.primary }]}>
              {t('settings.backup')}
            </Text>
            <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>
              Automatically backup your data
            </Text>
          </View>
          <View style={[styles.settingItem, { borderBottomColor: colors.neutral[200] }]}>
            <Text style={[styles.settingLabel, { color: colors.text.primary }]}>
              {t('settings.export')}
            </Text>
            <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>
              Export your data to external storage
            </Text>
          </View>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          {t('settings.about')}
        </Text>
        <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.settingItem, { borderBottomColor: colors.neutral[200] }]}>
            <Text style={[styles.settingLabel, { color: colors.text.primary }]}>
              {t('settings.version')}
            </Text>
            <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>
              1.0.0
            </Text>
          </View>
          <View style={[styles.settingItem, { borderBottomColor: 'transparent' }]}>
            <Text style={[styles.settingLabel, { color: colors.text.primary }]}>
              {t('settings.build')}
            </Text>
            <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>
              2025.01.01
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});