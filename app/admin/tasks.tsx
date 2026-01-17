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
import { FileText, Users, Clock } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Typography, Spacing, BorderRadius } from '@/constants/typography';
import { AdminService } from '@/lib/adminService';

export default function AdminTasks() {
  const [sharedTasks, setSharedTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTasks = async () => {
    try {
      const tasks = await AdminService.getSharedTasks();
      setSharedTasks(tasks);
    } catch (error) {
      console.error('[AdminTasks] Error loading tasks:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
        <Text style={styles.title}>Task & Collaboration Monitoring</Text>
        <Text style={styles.subtitle}>{sharedTasks.length} shared tasks</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadTasks();
            }}
            tintColor={Colors.primary}
          />
        }
      >
        {sharedTasks.map((share) => (
          <View key={share.id} style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <FileText size={20} color={Colors.primary} />
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{share.task?.title || 'Unknown Task'}</Text>
                <Text style={styles.taskMeta}>
                  {share.permission === 'edit' ? 'Edit' : 'View'} permission
                </Text>
              </View>
            </View>
            
            <View style={styles.collaborators}>
              <View style={styles.collaboratorItem}>
                <Users size={16} color={Colors.textSecondary} />
                <Text style={styles.collaboratorLabel}>Shared by:</Text>
                <Text style={styles.collaboratorName}>{share.shared_by?.name || share.shared_by?.email || 'Unknown'}</Text>
              </View>
              <View style={styles.collaboratorItem}>
                <Users size={16} color={Colors.primary} />
                <Text style={styles.collaboratorLabel}>Shared with:</Text>
                <Text style={styles.collaboratorName}>{share.shared_with?.name || share.shared_with?.email || 'Unknown'}</Text>
              </View>
            </View>

            <View style={styles.taskFooter}>
              <Clock size={14} color={Colors.textTertiary} />
              <Text style={styles.taskDate}>{formatDate(share.created_at)}</Text>
            </View>
          </View>
        ))}

        {sharedTasks.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No shared tasks found</Text>
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
  taskCard: {
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
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  taskInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  taskTitle: {
    ...Typography.headline,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  taskMeta: {
    ...Typography.caption1,
    color: Colors.primary,
  },
  collaborators: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  collaboratorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  collaboratorLabel: {
    ...Typography.caption1,
    color: Colors.textSecondary,
  },
  collaboratorName: {
    ...Typography.caption1,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  taskDate: {
    ...Typography.caption2,
    color: Colors.textTertiary,
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
