import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Moon, Sun, Smartphone, Check } from 'lucide-react-native';
import { useTheme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeToggleProps {
  style?: any;
}

const STORAGE_KEY = '@hearthlight_theme';

export default function ThemeToggle({ style }: ThemeToggleProps) {
  const { isDarkMode, setDarkMode, setSystemTheme, colors } = useTheme();
  const { t } = useI18n();
  const [showModal, setShowModal] = useState(false);
  const [currentSetting, setCurrentSetting] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    const loadCurrentSetting = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        setCurrentSetting(saved as 'light' | 'dark' | 'system' || 'system');
      } catch (error) {
        console.warn('Failed to load theme setting:', error);
      }
    };
    loadCurrentSetting();
  }, []);

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    setCurrentSetting(theme);
    if (theme === 'system') {
      await setSystemTheme();
    } else {
      await setDarkMode(theme === 'dark');
    }
    setShowModal(false);
  };

  const getThemeDescription = () => {
    switch (currentSetting) {
      case 'light':
        return 'Light Mode';
      case 'dark':
        return 'Dark Mode';
      case 'system':
        return 'Follow System';
      default:
        return 'Follow System';
    }
  };

  const getThemeIcon = () => {
    switch (currentSetting) {
      case 'light':
        return <Sun size={20} color={colors.text.secondary} />;
      case 'dark':
        return <Moon size={20} color={colors.text.secondary} />;
      case 'system':
        return <Smartphone size={20} color={colors.text.secondary} />;
      default:
        return <Smartphone size={20} color={colors.text.secondary} />;
    }
  };

  const themeOptions = [
    { key: 'light', label: 'Light Mode', icon: Sun },
    { key: 'dark', label: 'Dark Mode', icon: Moon },
    { key: 'system', label: 'Follow System', icon: Smartphone },
  ];

  return (
    <>
      <TouchableOpacity 
        style={[styles.container, { backgroundColor: colors.surface }, style]}
        onPress={() => setShowModal(true)}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            {getThemeIcon()}
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.label, { color: colors.text.primary }]}>
              {t('settings.theme')}
            </Text>
            <Text style={[styles.description, { color: colors.text.secondary }]}>
              {getThemeDescription()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                {t('settings.theme')}
              </Text>
            </View>
            
            <ScrollView style={styles.optionsList}>
              {themeOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.optionItem, { borderBottomColor: colors.neutral[200] }]}
                    onPress={() => handleThemeChange(option.key as 'light' | 'dark' | 'system')}
                  >
                    <View style={styles.optionContent}>
                      <IconComponent size={20} color={colors.text.secondary} />
                      <Text style={[styles.optionText, { color: colors.text.primary }]}>
                        {option.label}
                      </Text>
                    </View>
                    {currentSetting === option.key && (
                      <Check size={20} color={colors.primary[500]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.closeButton, { borderTopColor: colors.neutral[200] }]}
              onPress={() => setShowModal(false)}
            >
              <Text style={[styles.closeButtonText, { color: colors.primary[500] }]}>
                {t('common.close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    marginVertical: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  closeButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});