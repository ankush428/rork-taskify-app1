import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Check, Clock, Flag, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Typography, Spacing, BorderRadius } from '@/constants/typography';
import { Task } from '@/types';

interface TaskCardProps {
  task: Task;
  onPress: () => void;
  onToggleComplete: () => void;
}

const priorityColors = {
  high: Colors.priority.high,
  medium: Colors.priority.medium,
  low: Colors.priority.low,
  none: Colors.priority.none,
};

export default function TaskCard({ task, onPress, onToggleComplete }: TaskCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const checkAnim = useRef(new Animated.Value(task.status === 'completed' ? 1 : 0)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const handleToggleComplete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(checkAnim, {
      toValue: task.status === 'completed' ? 0 : 1,
      useNativeDriver: true,
    }).start();
    onToggleComplete();
  };

  const formatTime = (time?: string) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const isOverdue = task.status === 'overdue';
  const isCompleted = task.status === 'completed';

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <TouchableOpacity
          style={[
            styles.checkbox,
            isCompleted && styles.checkboxCompleted,
            { borderColor: priorityColors[task.priority] },
          ]}
          onPress={handleToggleComplete}
        >
          <Animated.View
            style={[
              styles.checkInner,
              {
                backgroundColor: priorityColors[task.priority],
                opacity: checkAnim,
                transform: [{ scale: checkAnim }],
              },
            ]}
          >
            <Check size={14} color={Colors.textInverse} strokeWidth={3} />
          </Animated.View>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              isCompleted && styles.titleCompleted,
            ]}
            numberOfLines={1}
          >
            {task.title}
          </Text>
          
          <View style={styles.meta}>
            {task.dueTime && (
              <View style={styles.metaItem}>
                <Clock size={12} color={isOverdue ? Colors.error : Colors.textTertiary} />
                <Text style={[styles.metaText, isOverdue && styles.metaTextOverdue]}>
                  {formatTime(task.dueTime)}
                </Text>
              </View>
            )}
            
            {task.priority !== 'none' && (
              <View style={styles.metaItem}>
                <Flag size={12} color={priorityColors[task.priority]} />
                <Text style={[styles.metaText, { color: priorityColors[task.priority] }]}>
                  {task.priority}
                </Text>
              </View>
            )}

            {isOverdue && (
              <View style={[styles.badge, styles.badgeOverdue]}>
                <Text style={styles.badgeText}>Overdue</Text>
              </View>
            )}
          </View>
        </View>

        <ChevronRight size={20} color={Colors.textTertiary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  checkboxCompleted: {
    backgroundColor: 'transparent',
  },
  checkInner: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
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
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    ...Typography.caption1,
    color: Colors.textTertiary,
    textTransform: 'capitalize',
  },
  metaTextOverdue: {
    color: Colors.error,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  badgeOverdue: {
    backgroundColor: Colors.error + '20',
  },
  badgeText: {
    ...Typography.caption2,
    color: Colors.error,
    fontWeight: '600' as const,
  },
});
