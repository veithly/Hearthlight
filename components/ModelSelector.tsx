import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useModelStore } from '@/lib/stores/modelStore';
import { useTheme } from '@/lib/theme';

export default function ModelSelector() {
  const { colors } = useTheme();
  const { providers, selectedModel, setSelectedModel, loadInitialData } = useModelStore();

  useEffect(() => {
    loadInitialData();
  }, []);

  return (
    <View style={styles.container}>
      {providers.map((provider: import('@/types').AIProvider) => (
        <TouchableOpacity
          key={provider.id}
          style={[
            styles.option,
            selectedModel?.id === provider.id && styles.activeOption,
          ]}
          onPress={() => setSelectedModel(provider)}
        >
          <View>
            <Text style={[styles.optionText, selectedModel?.id === provider.id && styles.activeOptionText]}>
              {provider.name}
            </Text>
            <Text style={[styles.modelText, selectedModel?.id === provider.id && styles.activeModelText]}>
              Model: {provider.model}
            </Text>
          </View>
          {selectedModel?.id === provider.id && (
            <View style={styles.checkContainer}>
              <Check size={20} color={colors.text.inverse} />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeOption: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  optionText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: colors.text.primary,
  },
  activeOptionText: {
    color: colors.primary[500],
  },
  modelText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  activeModelText: {
    color: colors.primary[400],
  },
  checkContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
});
}