/**
 * Agent Detail Screen
 * 
 * Detailed view of a single agent with metrics and controls
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';

type AgentDetailRouteProp = RouteProp<RootStackParamList, 'AgentDetail'>;

interface AgentDetail {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'paused';
  balance: number;
  totalEarnings: number;
  totalCosts: number;
  age: number;
  maxLifespan: number;
  generation: number;
  specialization: string;
  model: string;
  skills: string[];
  recentActivities: Activity[];
  performance: {
    successRate: number;
    avgProfit: number;
    totalTrades: number;
  };
}

interface Activity {
  id: string;
  type: 'trade' | 'earn' | 'cost' | 'action';
  description: string;
  amount?: number;
  timestamp: Date;
}

export default function AgentDetailScreen() {
  const route = useRoute<AgentDetailRouteProp>();
  const { agentId } = route.params;
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgentDetails();
  }, [agentId]);

  const loadAgentDetails = async () => {
    try {
      // TODO: Replace with actual API call
      const mockAgent: AgentDetail = {
        id: agentId,
        name: 'TraderBot Alpha',
        status: 'active',
        balance: 2.5,
        totalEarnings: 15.3,
        totalCosts: 3.2,
        age: 45,
        maxLifespan: 365,
        generation: 1,
        specialization: 'DeFi Trading',
        model: 'GPT-4',
        skills: ['Jupiter Swaps', 'Orca Pools', 'Risk Management'],
        recentActivities: [
          {
            id: '1',
            type: 'trade',
            description: 'Swapped 1 SOL for 150 USDC',
            amount: 0.05,
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
          },
          {
            id: '2',
            type: 'earn',
            description: 'Earned yield from Orca pool',
            amount: 0.12,
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          },
          {
            id: '3',
            type: 'cost',
            description: 'AI inference cost',
            amount: -0.002,
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
          },
        ],
        performance: {
          successRate: 87.5,
          avgProfit: 0.34,
          totalTrades: 156,
        },
      };

      setAgent(mockAgent);
    } catch (error) {
      console.error('Error loading agent details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePauseAgent = () => {
    Alert.alert(
      'Pause Agent',
      'Are you sure you want to pause this agent?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pause',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement pause logic
            Alert.alert('Success', 'Agent paused');
          },
        },
      ]
    );
  };

  const handleResumeAgent = () => {
    // TODO: Implement resume logic
    Alert.alert('Success', 'Agent resumed');
  };

  const handleTerminateAgent = () => {
    Alert.alert(
      'Terminate Agent',
      'This will permanently terminate the agent. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Terminate',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement terminate logic
            Alert.alert('Success', 'Agent terminated');
          },
        },
      ]
    );
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14F195" />
        <Text style={styles.loadingText}>Loading agent...</Text>
      </View>
    );
  }

  if (!agent) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Agent not found</Text>
      </View>
    );
  }

  const netProfit = agent.totalEarnings - agent.totalCosts;
  const profitMargin = (netProfit / agent.totalEarnings) * 100;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.agentName}>{agent.name}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: agent.status === 'active' ? '#14F195' : '#888' }
        ]}>
          <Text style={styles.statusText}>{agent.status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceValue}>{agent.balance.toFixed(4)} SOL</Text>
        <View style={styles.profitRow}>
          <Text style={styles.profitLabel}>Net Profit:</Text>
          <Text style={[styles.profitValue, netProfit >= 0 ? styles.positive : styles.negative]}>
            {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(4)} SOL ({profitMargin.toFixed(1)}%)
          </Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Earnings</Text>
          <Text style={[styles.statValue, styles.positive]}>
            +{agent.totalEarnings.toFixed(2)} SOL
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Costs</Text>
          <Text style={[styles.statValue, styles.negative]}>
            -{agent.totalCosts.toFixed(2)} SOL
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Age</Text>
          <Text style={styles.statValue}>{agent.age} / {agent.maxLifespan} days</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Generation</Text>
          <Text style={styles.statValue}>Gen {agent.generation}</Text>
        </View>
      </View>

      {/* Performance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance</Text>
        <View style={styles.performanceCard}>
          <View style={styles.performanceRow}>
            <Text style={styles.performanceLabel}>Success Rate</Text>
            <Text style={styles.performanceValue}>{agent.performance.successRate}%</Text>
          </View>
          <View style={styles.performanceRow}>
            <Text style={styles.performanceLabel}>Avg Profit/Trade</Text>
            <Text style={styles.performanceValue}>{agent.performance.avgProfit.toFixed(4)} SOL</Text>
          </View>
          <View style={styles.performanceRow}>
            <Text style={styles.performanceLabel}>Total Trades</Text>
            <Text style={styles.performanceValue}>{agent.performance.totalTrades}</Text>
          </View>
        </View>
      </View>

      {/* Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Specialization</Text>
            <Text style={styles.infoValue}>{agent.specialization}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>AI Model</Text>
            <Text style={styles.infoValue}>{agent.model}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Skills</Text>
            <View style={styles.skillsContainer}>
              {agent.skills.map((skill, index) => (
                <View key={index} style={styles.skillBadge}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {agent.recentActivities.map((activity) => (
          <View key={activity.id} style={styles.activityItem}>
            <View style={styles.activityLeft}>
              <Text style={styles.activityIcon}>
                {activity.type === 'trade' ? '💱' : 
                 activity.type === 'earn' ? '💰' : 
                 activity.type === 'cost' ? '💸' : '⚡'}
              </Text>
              <View>
                <Text style={styles.activityDescription}>{activity.description}</Text>
                <Text style={styles.activityTime}>{formatTimeAgo(activity.timestamp)}</Text>
              </View>
            </View>
            {activity.amount && (
              <Text style={[
                styles.activityAmount,
                activity.amount >= 0 ? styles.positive : styles.negative
              ]}>
                {activity.amount >= 0 ? '+' : ''}{activity.amount.toFixed(4)} SOL
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {agent.status === 'active' ? (
          <TouchableOpacity style={styles.pauseButton} onPress={handlePauseAgent}>
            <Text style={styles.pauseButtonText}>⏸️ Pause Agent</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.resumeButton} onPress={handleResumeAgent}>
            <Text style={styles.resumeButtonText}>▶️ Resume Agent</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.terminateButton} onPress={handleTerminateAgent}>
          <Text style={styles.terminateButtonText}>🗑️ Terminate</Text>
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
  errorContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  agentName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  balanceCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#14F195',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profitLabel: {
    fontSize: 14,
    color: '#888',
  },
  profitValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positive: {
    color: '#14F195',
  },
  negative: {
    color: '#FF4444',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
    margin: '1%',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  performanceCard: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  performanceLabel: {
    fontSize: 14,
    color: '#888',
  },
  performanceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
  },
  infoRow: {
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  skillBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: {
    fontSize: 12,
    color: '#14F195',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  activityDescription: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#888',
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  controls: {
    padding: 20,
    paddingBottom: 40,
  },
  pauseButton: {
    backgroundColor: '#FFA500',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  pauseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  resumeButton: {
    backgroundColor: '#14F195',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  resumeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  terminateButton: {
    backgroundColor: '#FF4444',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  terminateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
