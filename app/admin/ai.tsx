import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brain, TrendingUp, AlertCircle, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Typography, Spacing, BorderRadius } from '@/constants/typography';
import { AdminService } from '@/lib/adminService';
import { useAuth } from '@/providers/AuthProvider';

export default function AdminAI() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [limits, setLimits] = useState({ free: 50, pro: 500, max: 5000 });

  const loadStats = async () => {
    try {
      const data = await AdminService.getAIUsageStats();
      setStats(data);
      
      const settings = await AdminService.getSystemSettings();
      if (settings?.ai_limits) {
        setLimits(settings.ai_limits);
      }
    } catch (error) {
      console.error('[AdminAI] Error loading stats:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleUpdateLimits = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const success = await AdminService.updateAILimits(limits);
    if (success) {
      Alert.alert('Success', 'AI limits updated');
    } else {
      Alert.alert('Error', 'Failed to update limits');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Usage & Limits</Text>
        <Text style={styles.subtitle}>Monitor and manage AI requests</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadStats();
            }}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Activity</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Brain size={24} color={Colors.primary} />
              <Text style={styles.statValue}>{stats?.total_today || 0}</Text>
              <Text style={styles.statLabel}>Total Requests</Text>
            </View>
            <View style={styles.statCard}>
              <AlertCircle size={24} color={Colors.error} />
              <Text style={styles.statValue}>{stats?.failed_today || 0}</Text>
              <Text style={styles.statLabel}>Failed</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plan Limits</Text>
          <View style={styles.limitsCard}>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Free:</Text>
              <TextInput
                style={styles.limitInput}
                value={limits.free.toString()}
                onChangeText={(text) => setLimits({ ...limits, free: parseInt(text) || 0 })}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Pro:</Text>
              <TextInput
                style={styles.limitInput}
                value={limits.pro.toString()}
                onChangeText={(text) => setLimits({ ...limits, pro: parseInt(text) || 0 })}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Max:</Text>
              <TextInput
                style={styles.limitInput}
                value={limits.max.toString()}
                onChangeText={(text) => setLimits({ ...limits, max: parseInt(text) || 0 })}
                keyboardType="number-pad"
              />
            </View>
            <TouchableOpacity
              style={styles.updateButton}
              onPress={handleUpdateLimits}
            >
              <Text style={styles.updateButtonText}>Update Limits</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top AI Users</Text>
          {stats?.top_users?.map((topUser: any, index: number) => (
            <View key={topUser.user_id} style={styles.userRow}>
              <Text style={styles.userRank}>#{index + 1}</Text>
              <View style={styles.userInfo}>
                <Text style={styles.userPlan}>{topUser.plan.toUpperCase()}</Text>
                <Text style={styles.userUsage}>{topUser.current_usage} requests</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  title: {
    ...Typography.largeTitle,
    color: Colors.text,
  },
  subtitle: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.headline,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    ...Typography.title2,
    color: Colors.text,
    fontWeight: '700' as const,
    marginTop: Spacing.sm,
  },
  statLabel: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  limitsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  limitLabel: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  limitInput: {
    ...Typography.body,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 100,
    textAlign: 'right',
    color: Colors.text,
  },
  updateButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  updateButtonText: {
    ...Typography.body,
    color: Colors.textInverse,
    fontWeight: '600' as const,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  userRank: {
    ...Typography.headline,
    color: Colors.textSecondary,
    width: 30,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  userPlan: {
    ...Typography.caption1,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  userUsage: {
    ...Typography.caption2,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
