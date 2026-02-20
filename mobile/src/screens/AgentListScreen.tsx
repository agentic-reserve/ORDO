/**
 * Agent List Screen
 * 
 * Display and manage all user's AI agents
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';

type AgentListNavigationProp = StackNavigationProp<RootStackParamList, 'AgentList'>;

interface Agent {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'paused';
  balance: number;
  earnings: number;
  age: number;
  generation: number;
  specialization: string;
}

export default function AgentListScreen() {
  const navigation = useNavigation<AgentListNavigationProp>();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      // TODO: Replace with actual API call
      // Simulated data for now
      const mockAgents: Agent[] = [
        {
          id: '1',
          name: 'TraderBot Alpha',
          status: 'active',
          balance: 2.5,
          earnings: 15.3,
          age: 45,
          generation: 1,
          specialization: 'DeFi Trading',
        },
        {
          id: '2',
          name: 'NFT Hunter',
          status: 'active',
          balance: 1.8,
          earnings: 8.7,
          age: 30,
          generation: 1,
          specialization: 'NFT Trading',
        },
        {
          id: '3',
          name: 'Yield Farmer',
          status: 'idle',
          balance: 5.2,
          earnings: 22.1,
          age: 60,
          generation: 2,
          specialization: 'Yield Farming',
        },
        {
          id: '4',
          name: 'Scout Agent',
          status: 'paused',
          balance: 0.5,
          earnings: 2.3,
          age: 15,
          generation: 1,
          specialization: 'Market Research',
        },
      ];

      setAgents(mockAgents);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAgents();
  };

  const handleAgentPress = (agentId: string) => {
    navigation.navigate('AgentDetail', { agentId });
  };

  const handleCreateAgent = () => {
    navigation.navigate('CreateAgent');
  };

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'active':
        return '#14F195';
      case 'idle':
        return '#FFA500';
      case 'paused':
        return '#888';
      default:
        return '#888';
    }
  };

  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'active':
        return '🟢';
      case 'idle':
        return '🟡';
      case 'paused':
        return '⏸️';
      default:
        return '⚪';
    }
  };

  const renderAgent = ({ item }: { item: Agent }) => (
    <TouchableOpacity
      style={styles.agentCard}
      onPress={() => handleAgentPress(item.id)}
    >
      <View style={styles.agentHeader}>
        <View style={styles.agentTitleRow}>
          <Text style={styles.agentName}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>
              {getStatusIcon(item.status)} {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.agentSpecialization}>{item.specialization}</Text>
      </View>

      <View style={styles.agentStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Balance</Text>
          <Text style={styles.statValue}>{item.balance.toFixed(2)} SOL</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Earnings</Text>
          <Text style={[styles.statValue, styles.earningsValue]}>
            +{item.earnings.toFixed(2)} SOL
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Age</Text>
          <Text style={styles.statValue}>{item.age} days</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Gen</Text>
          <Text style={styles.statValue}>{item.generation}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🤖</Text>
      <Text style={styles.emptyTitle}>No Agents Yet</Text>
      <Text style={styles.emptyText}>
        Create your first AI agent to get started
      </Text>
      <TouchableOpacity style={styles.createButton} onPress={handleCreateAgent}>
        <Text style={styles.createButtonText}>Create Agent</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14F195" />
        <Text style={styles.loadingText}>Loading agents...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Agents</Text>
        <Text style={styles.subtitle}>
          {agents.length} {agents.length === 1 ? 'agent' : 'agents'} active
        </Text>
      </View>

      <FlatList
        data={agents}
        renderItem={renderAgent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#14F195"
          />
        }
      />

      {agents.length > 0 && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleCreateAgent}
        >
          <Text style={styles.floatingButtonText}>+ Create Agent</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 10,
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
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  listContent: {
    padding: 15,
    paddingBottom: 80,
  },
  agentCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  agentHeader: {
    marginBottom: 15,
  },
  agentTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  agentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  agentSpecialization: {
    fontSize: 14,
    color: '#888',
  },
  agentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  earningsValue: {
    color: '#14F195',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
  },
  createButton: {
    backgroundColor: '#14F195',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#14F195',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#14F195',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
});
