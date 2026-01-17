import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, Clock, Flag, CheckCircle2, Circle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Typography, Spacing, BorderRadius } from '@/constants/typography';
import { Task } from '@/types';
import { useApp } from '@/providers/AppProvider';

interface ChatTaskCardProps {
  task: Task;
}

export default function ChatTaskCard({ task }: ChatTaskCardProps) {
  const router = useRouter();
  const { toggleTaskComplete } = useApp();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const priorityColors = {
    high: Colors.priority.high,
    medium: Colors.priority.medium,
    low: Colors.priority.low,
    none: Colors.priority.none,
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/task/${task.id}`);
  };

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    toggleTaskComplete(task.id);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isCompleted = task.status === 'completed';

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {isCompleted ? (
              <CheckCircle2 size={22} color={Colors.success} fill={Colors.success} />
            ) : (
              <Circle size={22} color={Colors.border} />
            )}
          </TouchableOpacity>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColors[task.priority] }]}>
            <Flag size={10} color={Colors.textInverse} />
            <Text style={styles.priorityText}>{task.priority}</Text>
          </View>
        </View>

        <Text style={[styles.title, isCompleted && styles.titleCompleted]} numberOfLines={2}>
          {task.title}
        </Text>

        {task.description && (
          <Text style={styles.description} numberOfLines={2}>
            {task.description}
          </Text>
        )}

        <View style={styles.footer}>
          {task.dueDate && (
            <View style={styles.metaItem}>
              <Calendar size={12} color={Colors.textTertiary} />
              <Text style={styles.metaText}>{formatDate(task.dueDate)}</Text>
            </View>
          )}
          {task.dueTime && (
            <View style={styles.metaItem}>
              <Clock size={12} color={Colors.textTertiary} />
              <Text style={styles.metaText}>{task.dueTime}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
    maxWidth: 280,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  priorityText: {
    ...Typography.caption2,
    color: Colors.textInverse,
    textTransform: 'capitalize',
    fontWeight: '600' as const,
  },
  title: {
    ...Typography.headline,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textTertiary,
  },
  description: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...Typography.caption2,
    color: Colors.textTertiary,
  },
});
