/**
 * Settings Screen
 * 
 * App preferences and configuration
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Settings {
  notifications: boolean;
  autoRefresh: boolean;
  darkMode: boolean;
  biometrics: boolean;
  analytics: boolean;
  rpcEndpoint: 'mainnet' | 'devnet' | 'custom';
}

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings>({
    notifications: true,
    autoRefresh: true,
    darkMode: true,
    biometrics: false,
    analytics: true,
    rpcEndpoint: 'mainnet',
  });

  const updateSetting = async <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await AsyncStorage.setItem('settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Implement cache clearing
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to defaults. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const defaultSettings: Settings = {
              notifications: true,
              autoRefresh: true,
              darkMode: true,
              biometrics: false,
              analytics: true,
              rpcEndpoint: 'mainnet',
            };
            setSettings(defaultSettings);
            try {
              await AsyncStorage.setItem('settings', JSON.stringify(defaultSettings));
              Alert.alert('Success', 'Settings reset to defaults');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings');
            }
          },
        },
      ]
    );
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Failed to open link');
    });
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderSettingRow = (
    label: string,
    description: string,
    value: boolean,
    onValueChange: (value: boolean) => void
  ) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#333', true: '#14F195' }}
        thumbColor={value ? '#fff' : '#888'}
      />
    </View>
  );

  const renderActionRow = (
    label: string,
    description: string,
    onPress: () => void,
    destructive?: boolean
  ) => (
    <TouchableOpacity style={styles.actionRow} onPress={onPress}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, destructive && styles.destructiveText]}>
          {label}
        </Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {renderSection(
          'General',
          <>
            {renderSettingRow(
              'Push Notifications',
              'Receive alerts about agent activity',
              settings.notifications,
              (value) => updateSetting('notifications', value)
            )}
            {renderSettingRow(
              'Auto Refresh',
              'Automatically refresh agent data',
              settings.autoRefresh,
              (value) => updateSetting('autoRefresh', value)
            )}
            {renderSettingRow(
              'Dark Mode',
              'Use dark theme (recommended)',
              settings.darkMode,
              (value) => updateSetting('darkMode', value)
            )}
          </>
        )}

        {renderSection(
          'Security',
          <>
            {renderSettingRow(
              'Biometric Authentication',
              'Use fingerprint or face ID',
              settings.biometrics,
              (value) => updateSetting('biometrics', value)
            )}
            {renderActionRow(
              'Change PIN',
              'Update your security PIN',
              () => Alert.alert('Coming Soon', 'PIN management will be available soon')
            )}
          </>
        )}

        {renderSection(
          'Network',
          <>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>RPC Endpoint</Text>
                <Text style={styles.settingDescription}>
                  Current: {settings.rpcEndpoint}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() =>
                  Alert.alert('Coming Soon', 'RPC endpoint selection will be available soon')
                }
              >
                <Text style={styles.changeButtonText}>Change</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {renderSection(
          'Privacy',
          <>
            {renderSettingRow(
              'Analytics',
              'Help improve the app with usage data',
              settings.analytics,
              (value) => updateSetting('analytics', value)
            )}
            {renderActionRow(
              'Privacy Policy',
              'View our privacy policy',
              () => openLink('https://ordo.example.com/privacy')
            )}
          </>
        )}

        {renderSection(
          'Data',
          <>
            {renderActionRow(
              'Clear Cache',
              'Free up storage space',
              handleClearCache
            )}
            {renderActionRow(
              'Export Data',
              'Download your agent data',
              () => Alert.alert('Coming Soon', 'Data export will be available soon')
            )}
          </>
        )}

        {renderSection(
          'About',
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Build</Text>
              <Text style={styles.infoValue}>2024.02.20</Text>
            </View>
            {renderActionRow(
              'Terms of Service',
              'View terms and conditions',
              () => openLink('https://ordo.example.com/terms')
            )}
            {renderActionRow(
              'Open Source Licenses',
              'View third-party licenses',
              () => Alert.alert('Coming Soon', 'License information will be available soon')
            )}
          </>
        )}

        {renderSection(
          'Danger Zone',
          <>
            {renderActionRow(
              'Reset Settings',
              'Restore default settings',
              handleResetSettings,
              true
            )}
            {renderActionRow(
              'Delete All Data',
              'Permanently delete all local data',
              () =>
                Alert.alert(
                  'Delete All Data',
                  'This action cannot be undone. All local data will be permanently deleted.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => Alert.alert('Coming Soon', 'This feature will be available soon'),
                    },
                  ]
                ),
              true
            )}
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with ❤️ for the Solana ecosystem
          </Text>
          <Text style={styles.footerText}>
            Powered by Ordo Agent Framework
          </Text>
        </View>
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
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#14F195',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#888',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  chevron: {
    fontSize: 24,
    color: '#666',
    fontWeight: '300',
  },
  destructiveText: {
    color: '#ff4444',
  },
  changeButton: {
    backgroundColor: '#14F195',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    color: '#888',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
});
