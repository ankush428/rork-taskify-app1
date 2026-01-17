import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Crown, UserX, TrendingUp, TrendingDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Typography, Spacing, BorderRadius } from '@/constants/typography';
import { AdminService } from '@/lib/adminService';
import { useAuth } from '@/providers/AuthProvider';

interface User {
  id: string;
  email: string;
  name: string;
  is_pro: boolean;
  created_at: string;
  updated_at: string;
  plan?: 'free' | 'pro' | 'max';
  ai_usage?: number;
  ai_limit?: number;
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const loadUsers = async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const { users: fetchedUsers, total: totalCount } = await AdminService.getUsers(
        currentPage,
        50,
        searchQuery || undefined
      );
      setUsers(reset ? fetchedUsers : [...users, ...fetchedUsers]);
      setTotal(totalCount || 0);
      if (reset) setPage(1);
    } catch (error) {
      console.error('[AdminUsers] Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers(true);
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery !== '') {
        loadUsers(true);
      }
    }, 500);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleUpgradePlan = async (userId: string, currentPlan: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const plans: ('free' | 'pro' | 'max')[] = ['free', 'pro', 'max'];
    const currentIndex = plans.indexOf(currentPlan as any);
    const nextPlan = plans[currentIndex + 1] || 'max';

    Alert.alert(
      'Upgrade Plan',
      `Upgrade user to ${nextPlan.toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade',
          onPress: async () => {
            const success = await AdminService.updateUserPlan(userId, nextPlan);
            if (success) {
              Alert.alert('Success', `User upgraded to ${nextPlan.toUpperCase()}`);
              loadUsers(true);
            } else {
              Alert.alert('Error', 'Failed to upgrade user');
            }
          },
        },
      ]
    );
  };

  const handleDowngradePlan = async (userId: string, currentPlan: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const plans: ('free' | 'pro' | 'max')[] = ['free', 'pro', 'max'];
    const currentIndex = plans.indexOf(currentPlan as any);
    const prevPlan = plans[currentIndex - 1] || 'free';

    Alert.alert(
      'Downgrade Plan',
      `Downgrade user to ${prevPlan.toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Downgrade',
          style: 'destructive',
          onPress: async () => {
            const success = await AdminService.updateUserPlan(userId, prevPlan);
            if (success) {
              Alert.alert('Success', `User downgraded to ${prevPlan.toUpperCase()}`);
              loadUsers(true);
            } else {
              Alert.alert('Error', 'Failed to downgrade user');
            }
          },
        },
      ]
    );
  };

  const handleBanUser = async (userId: string, userName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Ban User',
      `Ban ${userName}? This will prevent them from accessing the app.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban',
          style: 'destructive',
          onPress: async () => {
            const success = await AdminService.banUser(userId);
            if (success) {
              Alert.alert('Success', 'User banned');
              loadUsers(true);
            } else {
              Alert.alert('Error', 'Failed to ban user');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPlanColor = (plan?: string) => {
    switch (plan) {
      case 'pro':
        return Colors.info;
      case 'max':
        return Colors.warning;
      default:
        return Colors.textSecondary;
    }
  };

  if (isLoading && users.length === 0) {
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
        <Text style={styles.title}>User Management</Text>
        <Text style={styles.subtitle}>{total} total users</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by email or name..."
          placeholderTextColor={Colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadUsers(true);
            }}
            tintColor={Colors.primary}
          />
        }
      >
        {users.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userInfo}>
              <View style={styles.userHeader}>
                <Text style={styles.userName}>{user.name}</Text>
                <View style={[styles.planBadge, { backgroundColor: getPlanColor(user.plan) + '20' }]}>
                  <Text style={[styles.planText, { color: getPlanColor(user.plan) }]}>
                    {(user.plan || 'free').toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.userEmail}>{user.email}</Text>
              <Text style={styles.userMeta}>
                Joined: {formatDate(user.created_at)} • AI: {user.ai_usage || 0}/{user.ai_limit || 50}
              </Text>
            </View>
            
            <View style={styles.userActions}>
              {user.plan !== 'max' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.upgradeButton]}
                  onPress={() => handleUpgradePlan(user.id, user.plan || 'free')}
                >
                  <TrendingUp size={16} color={Colors.success} />
                </TouchableOpacity>
              )}
              {user.plan !== 'free' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.downgradeButton]}
                  onPress={() => handleDowngradePlan(user.id, user.plan || 'free')}
                >
                  <TrendingDown size={16} color={Colors.warning} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionButton, styles.banButton]}
                onPress={() => handleBanUser(user.id, user.name)}
              >
                <UserX size={16} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {users.length === 0 && !isLoading && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    paddingVertical: Spacing.md,
    paddingLeft: Spacing.sm,
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
  userCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  userName: {
    ...Typography.headline,
    color: Colors.text,
    flex: 1,
  },
  planBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  planText: {
    ...Typography.caption2,
    fontWeight: '600' as const,
  },
  userEmail: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  userMeta: {
    ...Typography.caption1,
    color: Colors.textTertiary,
  },
  userActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  upgradeButton: {
    backgroundColor: Colors.success + '20',
    borderColor: Colors.success,
  },
  downgradeButton: {
    backgroundColor: Colors.warning + '20',
    borderColor: Colors.warning,
  },
  banButton: {
    backgroundColor: Colors.error + '20',
    borderColor: Colors.error,
  },
  emptyContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
