import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Users,
  CheckSquare,
  MessageSquare,
  Share2,
  TrendingUp,
  Calendar,
  Zap,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Typography, Spacing, BorderRadius } from '@/constants/typography';
import { AdminService, AppMetrics } from '@/lib/adminService';
import { useAuth } from '@/providers/AuthProvider';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

function StatCard({ icon, title, value, subtitle, color = Colors.primary }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        {icon}
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value.toLocaleString()}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<AppMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMetrics = async () => {
    try {
      const data = await AdminService.getMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('[AdminDashboard] Error loading metrics:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadMetrics();
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

  if (!metrics) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load metrics</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Welcome, {user?.name}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon={<Users size={24} color={Colors.primary} />}
              title="Total Users"
              value={metrics.total_users}
              subtitle={`${metrics.active_users} active (7d)`}
            />
            <StatCard
              icon={<TrendingUp size={24} color={Colors.info} />}
              title="Active Users"
              value={metrics.active_users}
              subtitle="Last 7 days"
              color={Colors.info}
            />
            <StatCard
              icon={<CheckSquare size={24} color={Colors.success} />}
              title="Total Tasks"
              value={metrics.total_tasks}
              subtitle={`${metrics.tasks_created_today} today`}
              color={Colors.success}
            />
            <StatCard
              icon={<Share2 size={24} color={Colors.warning} />}
              title="Shared Tasks"
              value={metrics.shared_tasks}
              subtitle="Collaborations"
              color={Colors.warning}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Plans</Text>
          <View style={styles.statsGrid}>
            <View style={styles.planCard}>
              <Text style={styles.planLabel}>Free</Text>
              <Text style={styles.planValue}>{metrics.free_users}</Text>
            </View>
            <View style={[styles.planCard, { backgroundColor: Colors.info + '20' }]}>
              <Text style={styles.planLabel}>Pro</Text>
              <Text style={[styles.planValue, { color: Colors.info }]}>{metrics.pro_users}</Text>
            </View>
            <View style={[styles.planCard, { backgroundColor: Colors.warning + '20' }]}>
              <Text style={styles.planLabel}>Max</Text>
              <Text style={[styles.planValue, { color: Colors.warning }]}>{metrics.max_users}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Today</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityItem}>
              <MessageSquare size={20} color={Colors.primary} />
              <View style={styles.activityContent}>
                <Text style={styles.activityLabel}>AI Messages</Text>
                <Text style={styles.activityValue}>{metrics.ai_messages_today}</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <Zap size={20} color={Colors.warning} />
              <View style={styles.activityContent}>
                <Text style={styles.activityLabel}>Notifications Sent</Text>
                <Text style={styles.activityValue}>{metrics.notifications_sent_today}</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <Calendar size={20} color={Colors.success} />
              <View style={styles.activityContent}>
                <Text style={styles.activityLabel}>Tasks Created</Text>
                <Text style={styles.activityValue}>{metrics.tasks_created_today}</Text>
              </View>
            </View>
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    ...Typography.subhead,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.headline,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    ...Typography.title2,
    color: Colors.text,
    fontWeight: '700' as const,
  },
  statTitle: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statSubtitle: {
    ...Typography.caption2,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  planCard: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    minWidth: '30%',
  },
  planLabel: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  planValue: {
    ...Typography.title3,
    color: Colors.text,
    fontWeight: '700' as const,
    marginTop: Spacing.xs,
  },
  activityCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  activityContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  activityLabel: {
    ...Typography.caption1,
    color: Colors.textSecondary,
  },
  activityValue: {
    ...Typography.headline,
    color: Colors.text,
    marginTop: 2,
  },
});
