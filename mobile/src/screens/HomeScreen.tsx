/**
 * Home Screen
 * 
 * Main landing screen for Ordo Mobile
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { isSeeker, getSeekerDeviceDetails } from '../utils/seekerDetection';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [isSeekerDevice, setIsSeekerDevice] = useState(false);

  useEffect(() => {
    // Detect Seeker device
    const seekerDetected = isSeeker();
    setIsSeekerDevice(seekerDetected);

    if (seekerDetected) {
      const details = getSeekerDeviceDetails();
      console.log('Seeker device detected:', details);
    }
  }, []);

  const handleConnectWallet = () => {
    navigation.navigate('WalletConnect');
  };

  const handleViewAgents = () => {
    navigation.navigate('AgentList');
  };

  const handleCreateAgent = () => {
    navigation.navigate('CreateAgent');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleSeekerBenefits = () => {
    navigation.navigate('SeekerBenefits');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Ordo Mobile</Text>
          <Text style={styles.subtitle}>
            Manage your AI agents on Solana
          </Text>
        </View>

        {/* Seeker Badge */}
        {isSeekerDevice && (
          <TouchableOpacity 
            style={styles.seekerBadge}
            onPress={handleSeekerBenefits}
          >
            <Text style={styles.seekerBadgeText}>
              ⚡ Seeker Device Detected
            </Text>
            <Text style={styles.seekerBadgeSubtext}>
              Tap for exclusive benefits
            </Text>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleConnectWallet}
          >
            <Text style={styles.actionButtonText}>🔗 Connect Wallet</Text>
            <Text style={styles.actionButtonSubtext}>
              Connect your Solana wallet
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleViewAgents}
          >
            <Text style={styles.actionButtonText}>🤖 My Agents</Text>
            <Text style={styles.actionButtonSubtext}>
              View and manage your agents
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleCreateAgent}
          >
            <Text style={styles.actionButtonText}>➕ Create Agent</Text>
            <Text style={styles.actionButtonSubtext}>
              Deploy a new AI agent
            </Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>🔐 Secure</Text>
            <Text style={styles.featureText}>
              Your keys, your agents. All operations require your approval.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>⚡ Fast</Text>
            <Text style={styles.featureText}>
              Built on Solana for lightning-fast transactions.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>🤖 Autonomous</Text>
            <Text style={styles.featureText}>
              Agents can earn, trade, and evolve independently.
            </Text>
          </View>
        </View>

        {/* Settings */}
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={handleSettings}
        >
          <Text style={styles.settingsButtonText}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  seekerBadge: {
    backgroundColor: '#14F195',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    alignItems: 'center',
  },
  seekerBadgeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  seekerBadgeSubtext: {
    fontSize: 14,
    color: '#000',
    marginTop: 5,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  actionButtonSubtext: {
    fontSize: 14,
    color: '#888',
  },
  featureCard: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  featureText: {
    fontSize: 14,
    color: '#888',
  },
  settingsButton: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  settingsButtonText: {
    fontSize: 16,
    color: '#fff',
  },
});
