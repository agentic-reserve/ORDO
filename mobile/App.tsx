/**
 * Ordo Mobile - Main App Entry Point
 * 
 * React Native app for managing AI agents on Solana Mobile
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import AgentListScreen from './src/screens/AgentListScreen';
import AgentDetailScreen from './src/screens/AgentDetailScreen';
import CreateAgentScreen from './src/screens/CreateAgentScreen';
import WalletConnectScreen from './src/screens/WalletConnectScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SeekerBenefitsScreen from './src/screens/SeekerBenefitsScreen';

// Types
export type RootStackParamList = {
  Home: undefined;
  AgentList: undefined;
  AgentDetail: { agentId: string };
  CreateAgent: undefined;
  WalletConnect: undefined;
  Settings: undefined;
  SeekerBenefits: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#000',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{ title: 'Ordo Mobile' }}
          />
          <Stack.Screen 
            name="AgentList" 
            component={AgentListScreen}
            options={{ title: 'My Agents' }}
          />
          <Stack.Screen 
            name="AgentDetail" 
            component={AgentDetailScreen}
            options={{ title: 'Agent Details' }}
          />
          <Stack.Screen 
            name="CreateAgent" 
            component={CreateAgentScreen}
            options={{ title: 'Create Agent' }}
          />
          <Stack.Screen 
            name="WalletConnect" 
            component={WalletConnectScreen}
            options={{ title: 'Connect Wallet' }}
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen}
            options={{ title: 'Settings' }}
          />
          <Stack.Screen 
            name="SeekerBenefits" 
            component={SeekerBenefitsScreen}
            options={{ title: 'Seeker Benefits' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
