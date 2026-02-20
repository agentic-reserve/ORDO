/**
 * Seeker Benefits Screen
 * 
 * Shows exclusive benefits for Seeker device owners
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Connection, PublicKey } from '@solana/web3.js';
import { 
  detectSeeker, 
  getSeekerDeviceDetails,
  SeekerDeviceInfo 
} from '../utils/seekerDetection';

export default function SeekerBenefitsScreen() {
  const [deviceInfo, setDeviceInfo] = useState<SeekerDeviceInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeviceInfo();
  }, []);

  const loadDeviceInfo = async () => {
    try {
      const info = await detectSeeker();
      setDeviceInfo(info);
    } catch (error) {
      console.error('Error detecting Seeker:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyWithWallet = async () => {
    Alert.alert(
      'Verify Seeker Ownership',
      'Connect your wallet to verify Seeker Genesis Token ownership',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Connect Wallet', 
          onPress: () => {
            // Navigate to wallet connect
            Alert.alert('Coming Soon', 'Wallet verification will be available soon');
          }
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!deviceInfo?.isSeeker) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Not a Seeker Device</Text>
          <Text style={styles.subtitle}>
            This device is not recognized as a Solana Seeker phone.
          </Text>
          <Text style={styles.infoText}>
            Seeker benefits are exclusive to Solana Seeker device owners.
          </Text>
        </View>
      </View>
    );
  }

  const details = getSeekerDeviceDetails();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Device Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Information</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Model:</Text>
            <Text style={styles.infoValue}>{details?.model}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Manufacturer:</Text>
            <Text style={styles.infoValue}>{details?.manufacturer}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Verification:</Text>
            <Text style={[
              styles.infoValue,
              deviceInfo.verified ? styles.verified : styles.unverified
            ]}>
              {deviceInfo.verified ? '✓ Verified' : '⚠ Unverified'}
            </Text>
          </View>
        </View>

        {/* Verification */}
        {!deviceInfo.verified && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verify Ownership</Text>
            <Text style={styles.infoText}>
              Verify your Seeker ownership by connecting your wallet and proving
              you own a Seeker Genesis Token (SGT).
            </Text>
            <TouchableOpacity 
              style={styles.verifyButton}
              onPress={verifyWithWallet}
            >
              <Text style={styles.verifyButtonText}>
                Verify with Wallet
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Benefits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exclusive Benefits</Text>
          
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>⚡ Priority Access</Text>
            <Text style={styles.benefitText}>
              Get early access to new features and agent capabilities
            </Text>
          </View>

          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>💎 Reduced Fees</Text>
            <Text style={styles.benefitText}>
              Enjoy 50% reduced transaction fees for agent operations
            </Text>
          </View>

          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>🎁 Exclusive Rewards</Text>
            <Text style={styles.benefitText}>
              Earn bonus rewards for agent activities and achievements
            </Text>
          </View>

          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>🚀 Enhanced Performance</Text>
            <Text style={styles.benefitText}>
              Optimized agent performance on Seeker hardware
            </Text>
          </View>

          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>👥 Community Access</Text>
            <Text style={styles.benefitText}>
              Join exclusive Seeker owner community and events
            </Text>
          </View>
        </View>

        {/* Coming Soon */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coming Soon</Text>
          
          <View style={styles.comingSoonCard}>
            <Text style={styles.comingSoonText}>
              • Seeker-only agent templates
            </Text>
            <Text style={styles.comingSoonText}>
              • Hardware-accelerated AI inference
            </Text>
            <Text style={styles.comingSoonText}>
              • Exclusive DeFi integrations
            </Text>
            <Text style={styles.comingSoonText}>
              • NFT rewards for Seeker owners
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
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 20,
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
  infoCard: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#888',
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  verified: {
    color: '#14F195',
  },
  unverified: {
    color: '#FFA500',
  },
  infoText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 15,
    lineHeight: 20,
  },
  verifyButton: {
    backgroundColor: '#14F195',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  benefitCard: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#14F195',
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  benefitText: {
    fontSize: 14,
    color: '#888',
  },
  comingSoonCard: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
});
