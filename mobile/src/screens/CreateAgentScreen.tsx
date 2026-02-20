/**
 * Create Agent Screen
 * 
 * Multi-step wizard for creating new AI agents
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';

type CreateAgentNavigationProp = StackNavigationProp<RootStackParamList, 'CreateAgent'>;

type AgentSpecialization = 'defi' | 'nft' | 'yield' | 'research' | 'custom';

interface AgentConfig {
  name: string;
  specialization: AgentSpecialization;
  initialBalance: string;
  riskTolerance: 'low' | 'medium' | 'high';
  autoTrade: boolean;
}

export default function CreateAgentScreen() {
  const navigation = useNavigation<CreateAgentNavigationProp>();
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [config, setConfig] = useState<AgentConfig>({
    name: '',
    specialization: 'defi',
    initialBalance: '1.0',
    riskTolerance: 'medium',
    autoTrade: false,
  });

  const specializations = [
    { id: 'defi' as const, name: 'DeFi Trading', icon: '💱', description: 'Trade tokens and provide liquidity' },
    { id: 'nft' as const, name: 'NFT Trading', icon: '🖼️', description: 'Buy and sell NFTs for profit' },
    { id: 'yield' as const, name: 'Yield Farming', icon: '🌾', description: 'Optimize yield across protocols' },
    { id: 'research' as const, name: 'Market Research', icon: '🔍', description: 'Analyze markets and trends' },
    { id: 'custom' as const, name: 'Custom', icon: '⚙️', description: 'Build your own strategy' },
  ];

  const handleCreate = async () => {
    if (!config.name.trim()) {
      Alert.alert('Error', 'Please enter an agent name');
      return;
    }

    const balance = parseFloat(config.initialBalance);
    if (isNaN(balance) || balance < 0.1) {
      Alert.alert('Error', 'Minimum initial balance is 0.1 SOL');
      return;
    }

    setCreating(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Success',
        `Agent "${config.name}" created successfully!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('AgentList'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create agent. Please try again.');
      console.error('Error creating agent:', error);
    } finally {
      setCreating(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 1: Basic Info</Text>
      <Text style={styles.stepDescription}>Give your agent a name and purpose</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Agent Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., TraderBot Alpha"
          placeholderTextColor="#666"
          value={config.name}
          onChangeText={(text) => setConfig({ ...config, name: text })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Specialization</Text>
        <View style={styles.specializationGrid}>
          {specializations.map((spec) => (
            <TouchableOpacity
              key={spec.id}
              style={[
                styles.specializationCard,
                config.specialization === spec.id && styles.specializationCardActive,
              ]}
              onPress={() => setConfig({ ...config, specialization: spec.id })}
            >
              <Text style={styles.specializationIcon}>{spec.icon}</Text>
              <Text style={styles.specializationName}>{spec.name}</Text>
              <Text style={styles.specializationDescription}>{spec.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, !config.name.trim() && styles.buttonDisabled]}
        onPress={() => setStep(2)}
        disabled={!config.name.trim()}
      >
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 2: Configuration</Text>
      <Text style={styles.stepDescription}>Set up your agent's parameters</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Initial Balance (SOL)</Text>
        <TextInput
          style={styles.input}
          placeholder="1.0"
          placeholderTextColor="#666"
          keyboardType="decimal-pad"
          value={config.initialBalance}
          onChangeText={(text) => setConfig({ ...config, initialBalance: text })}
        />
        <Text style={styles.hint}>Minimum: 0.1 SOL</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Risk Tolerance</Text>
        <View style={styles.riskButtons}>
          {(['low', 'medium', 'high'] as const).map((risk) => (
            <TouchableOpacity
              key={risk}
              style={[
                styles.riskButton,
                config.riskTolerance === risk && styles.riskButtonActive,
              ]}
              onPress={() => setConfig({ ...config, riskTolerance: risk })}
            >
              <Text
                style={[
                  styles.riskButtonText,
                  config.riskTolerance === risk && styles.riskButtonTextActive,
                ]}
              >
                {risk.charAt(0).toUpperCase() + risk.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setConfig({ ...config, autoTrade: !config.autoTrade })}
        >
          <View style={[styles.checkbox, config.autoTrade && styles.checkboxChecked]}>
            {config.autoTrade && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.checkboxLabel}>
            <Text style={styles.label}>Enable Auto-Trading</Text>
            <Text style={styles.hint}>Agent will trade autonomously</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => setStep(1)}
        >
          <Text style={styles.buttonSecondaryText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={() => setStep(3)}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 3: Review</Text>
      <Text style={styles.stepDescription}>Confirm your agent configuration</Text>

      <View style={styles.reviewCard}>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Name:</Text>
          <Text style={styles.reviewValue}>{config.name}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Specialization:</Text>
          <Text style={styles.reviewValue}>
            {specializations.find(s => s.id === config.specialization)?.name}
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Initial Balance:</Text>
          <Text style={styles.reviewValue}>{config.initialBalance} SOL</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Risk Tolerance:</Text>
          <Text style={styles.reviewValue}>
            {config.riskTolerance.charAt(0).toUpperCase() + config.riskTolerance.slice(1)}
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Auto-Trading:</Text>
          <Text style={styles.reviewValue}>{config.autoTrade ? 'Enabled' : 'Disabled'}</Text>
        </View>
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningIcon}>⚠️</Text>
        <Text style={styles.warningText}>
          Your agent will have access to the specified SOL balance. Make sure you understand the risks.
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => setStep(2)}
          disabled={creating}
        >
          <Text style={styles.buttonSecondaryText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={handleCreate}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>Create Agent</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create New Agent</Text>
        <View style={styles.progressBar}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                s <= step && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  progressDot: {
    width: 30,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  progressDotActive: {
    backgroundColor: '#14F195',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#fff',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  specializationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specializationCard: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  specializationCardActive: {
    borderColor: '#14F195',
    backgroundColor: '#0a2a1a',
  },
  specializationIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  specializationName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  specializationDescription: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
  },
  riskButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  riskButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  riskButtonActive: {
    backgroundColor: '#14F195',
    borderColor: '#14F195',
  },
  riskButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  riskButtonTextActive: {
    color: '#000',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#14F195',
    borderColor: '#14F195',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  checkboxLabel: {
    flex: 1,
  },
  reviewCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  reviewLabel: {
    fontSize: 14,
    color: '#888',
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#2a1a0a',
    borderWidth: 1,
    borderColor: '#FFA500',
    borderRadius: 8,
    padding: 15,
    marginBottom: 30,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#FFA500',
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#14F195',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333',
  },
  buttonPrimary: {
    flex: 1,
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
