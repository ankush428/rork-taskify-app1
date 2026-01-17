import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, CheckCircle2, Clock, AlertCircle, Calendar } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Typography, Spacing, BorderRadius } from '@/constants/typography';
import { useApp } from '@/providers/AppProvider';
import TaskCard from '@/components/TaskCard';
import EmptyState from '@/components/EmptyState';

type TabType = 'today' | 'upcoming' | 'completed' | 'overdue';

const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: 'today', label: 'Today', icon: <Clock size={16} color={Colors.primary} /> },
  { key: 'upcoming', label: 'Upcoming', icon: <Calendar size={16} color={Colors.info} /> },
  { key: 'completed', label: 'Done', icon: <CheckCircle2 size={16} color={Colors.success} /> },
  { key: 'overdue', label: 'Overdue', icon: <AlertCircle size={16} color={Colors.error} /> },
];

export default function HomeScreen() {
  const router = useRouter();
  const {
    todayTasks,
    upcomingTasks,
    completedTasks,
    overdueTasks,
    toggleTaskComplete,
  } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [refreshing, setRefreshing] = useState(false);
  const fabScale = useRef(new Animated.Value(1)).current;

  const getTasksForTab = () => {
    switch (activeTab) {
      case 'today':
        return todayTasks;
      case 'upcoming':
        return upcomingTasks;
      case 'completed':
        return completedTasks;
      case 'overdue':
        return overdueTasks;
      default:
        return [];
    }
  };

  const tasks = getTasksForTab();

  const handleTabPress = (tab: TabType) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
  };

  const handleTaskPress = (taskId: string) => {
    router.push(`/task/${taskId}`);
  };

  const handleNewTask = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/new-task');
  };

  const handleFabPressIn = () => {
    Animated.spring(fabScale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handleFabPressOut = () => {
    Animated.spring(fabScale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getEmptyStateConfig = () => {
    switch (activeTab) {
      case 'today':
        return {
          icon: <Clock size={64} color={Colors.primaryLight} />,
          title: "Nothing due today",
          description: "Enjoy your free time or add a new task to stay productive.",
        };
      case 'upcoming':
        return {
          icon: <Calendar size={64} color={Colors.info} />,
          title: "No upcoming tasks",
          description: "Plan ahead by scheduling tasks for the future.",
        };
      case 'completed':
        return {
          icon: <CheckCircle2 size={64} color={Colors.success} />,
          title: "No completed tasks yet",
          description: "Start checking off tasks to see them here.",
        };
      case 'overdue':
        return {
          icon: <AlertCircle size={64} color={Colors.error} />,
          title: "All caught up!",
          description: "Great job staying on top of your tasks.",
        };
      default:
        return {
          icon: <Clock size={64} color={Colors.primaryLight} />,
          title: "No tasks",
          description: "Add a task to get started.",
        };
    }
  };

  const emptyConfig = getEmptyStateConfig();

  const getTabCount = (tab: TabType) => {
    switch (tab) {
      case 'today':
        return todayTasks.length;
      case 'upcoming':
        return upcomingTasks.length;
      case 'completed':
        return completedTasks.length;
      case 'overdue':
        return overdueTasks.length;
      default:
        return 0;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = getTabCount(tab.key);
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => handleTabPress(tab.key)}
                activeOpacity={0.7}
              >
                {tab.icon}
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {tasks.length === 0 ? (
          <EmptyState
            icon={emptyConfig.icon}
            title={emptyConfig.title}
            description={emptyConfig.description}
          />
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onPress={() => handleTaskPress(task.id)}
              onToggleComplete={() => toggleTaskComplete(task.id)}
            />
          ))
        )}
      </ScrollView>

      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleNewTask}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          activeOpacity={1}
        >
          <Plus size={28} color={Colors.textInverse} strokeWidth={2.5} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabContainer: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tabScroll: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primaryLight,
  },
  tabLabel: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  tabLabelActive: {
    color: Colors.primaryDark,
    fontWeight: '600' as const,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeActive: {
    backgroundColor: Colors.primary,
  },
  tabBadgeText: {
    ...Typography.caption2,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  tabBadgeTextActive: {
    color: Colors.textInverse,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  fabContainer: {
    position: 'absolute',
    bottom: Spacing.xxl,
    right: Spacing.xl,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
