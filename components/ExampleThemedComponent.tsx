import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme, useGlobalStyles } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import ThemedView from './ThemedView';
import ThemedText from './ThemedText';
import ThemedButton from './ThemedButton';

export default function ExampleThemedComponent() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const globalStyles = useGlobalStyles();

  return (
    <ThemedView variant="surface" style={[globalStyles.card, styles.container]}>
      <ThemedText variant="primary" style={globalStyles.heading}>
        {t('common.example')}
      </ThemedText>
      
      <ThemedText variant="secondary" style={globalStyles.body}>
        This component demonstrates how to use the theme system and i18n.
      </ThemedText>
      
      <View style={styles.buttonContainer}>
        <ThemedButton variant="primary" size="medium">
          {t('common.save')}
        </ThemedButton>
        
        <ThemedButton variant="outline" size="medium">
          {t('common.cancel')}
        </ThemedButton>
      </View>
      
      <ThemedText variant="tertiary" style={globalStyles.caption}>
        Current theme: {colors.background === '#FFFFFF' ? 'Light' : 'Dark'}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
  },
});