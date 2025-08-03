import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { 
  I18nContextType, 
  I18nProviderProps, 
  SUPPORTED_LOCALES, 
  DEFAULT_LOCALE, 
  FALLBACK_LOCALE 
} from './types';
import { translations, getNestedTranslation, interpolateParams } from './translations';

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const STORAGE_KEY = '@hearthlight_locale';

export function I18nProvider({ children, defaultLocale = DEFAULT_LOCALE }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<string>(defaultLocale);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize locale from storage or device settings
  useEffect(() => {
    const initializeLocale = async () => {
      try {
        // First, try to get saved locale from storage
        const savedLocale = await AsyncStorage.getItem(STORAGE_KEY);
        
        if (savedLocale && SUPPORTED_LOCALES.some(l => l.code === savedLocale)) {
          setLocaleState(savedLocale);
        } else {
          // Detect device locale
          const deviceLocales = Localization.getLocales();
          const deviceLocale = deviceLocales[0];
          
          // Find matching supported locale
          const matchedLocale = SUPPORTED_LOCALES.find(
            supportedLocale => 
              deviceLocale.languageTag.startsWith(supportedLocale.code) ||
              deviceLocale.languageCode === supportedLocale.code.split('-')[0]
          );
          
          const initialLocale = matchedLocale ? matchedLocale.code : DEFAULT_LOCALE;
          setLocaleState(initialLocale);
          
          // Save the detected/default locale
          await AsyncStorage.setItem(STORAGE_KEY, initialLocale);
        }
      } catch (error) {
        console.warn('Failed to initialize locale:', error);
        setLocaleState(DEFAULT_LOCALE);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeLocale();
  }, []);

  const setLocale = async (newLocale: string) => {
    if (!SUPPORTED_LOCALES.some(l => l.code === newLocale)) {
      console.warn(`Unsupported locale: ${newLocale}`);
      return;
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY, newLocale);
      setLocaleState(newLocale);
    } catch (error) {
      console.error('Failed to save locale:', error);
    }
  };

  const t = (key: string, params?: Record<string, any>): string => {
    // Try to get translation from current locale
    let translation = getNestedTranslation(translations[locale], key);
    
    // Fallback to default locale if not found
    if (!translation && locale !== FALLBACK_LOCALE) {
      translation = getNestedTranslation(translations[FALLBACK_LOCALE], key);
    }
    
    // If still not found, return the key itself
    if (!translation) {
      console.warn(`Translation missing for key: ${key} in locale: ${locale}`);
      return key;
    }
    
    // Interpolate parameters if provided
    return interpolateParams(translation, params);
  };

  const currentLocaleConfig = SUPPORTED_LOCALES.find(l => l.code === locale);
  const isRTL = currentLocaleConfig?.direction === 'rtl';

  const contextValue: I18nContextType = {
    locale,
    setLocale,
    t,
    isRTL,
    availableLocales: SUPPORTED_LOCALES,
  };

  // Don't render children until locale is initialized
  if (!isInitialized) {
    return null;
  }

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}