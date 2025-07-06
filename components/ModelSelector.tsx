import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useModelStore } from '@/lib/stores/modelStore';

export default function ModelSelector() {
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
              <Check size={20} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeOption: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F5F3FF',
  },
  optionText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  activeOptionText: {
    color: '#8B5CF6',
  },
  modelText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  activeModelText: {
    color: '#A78BFA',
  },
  checkContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});