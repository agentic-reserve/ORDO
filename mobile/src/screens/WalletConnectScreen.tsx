/**
 * Wallet Connect Screen
 * 
 * Connect mobile wallet using Mobile Wallet Adapter
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { connectWallet, WalletSession } from '../utils/mobileWallet';

export default function WalletConnectScreen() {
  const [connecting, setConnecting] = useState(false);
  const [session, setSession] = useState<WalletSession | null>(null);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const walletSession = await connectWallet();
      setSession(walletSession);
      Alert.alert(
        'Wallet Connected',
        `Connected to ${walletSession.accountLabel || 'wallet'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Wallet connection error:', error);
      Alert.alert(
        'Connection Failed',
        'Failed to connect wallet. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setConnecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Connect Wallet</Text>
        <Text style={styles.subtitle}>
          Connect your Solana mobile wallet to manage agents
        </Text>

        {!session ? (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                • Your wallet will open for authorization
              </Text>
              <Text style={styles.infoText}>
                • Approve the connection request
              </Text>
              <Text style={styles.infoText}>
                • Your keys never leave your wallet
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.connectButton, connecting && styles.connectButtonDisabled]}
              onPress={handleConnect}
              disabled={connecting}
            >
              {connecting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.connectButtonText}>Connect Wallet</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.connectedBox}>
            <Text style={styles.connectedTitle}>✓ Connected</Text>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionLabel}>Wallet:</Text>
              <Text style={styles.sessionValue}>
                {session.accountLabel || 'Unknown'}
              </Text>
            </View>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionLabel}>Address:</Text>
              <Text style={styles.sessionValue} numberOfLines={1}>
                {session.publicKey.toBase58()}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 30,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
  },
  infoText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
  },
  connectButton: {
    backgroundColor: '#14F195',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  connectButtonDisabled: {
    opacity: 0.5,
  },
  connectButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  connectedBox: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#14F195',
  },
  connectedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#14F195',
    marginBottom: 20,
    textAlign: 'center',
  },
  sessionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sessionLabel: {
    fontSize: 14,
    color: '#888',
  },
  sessionValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
});
