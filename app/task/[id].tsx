import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Calendar,
  Clock,
  Flag,
  Tag,
  Trash2,
  Check,
  Edit3,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Typography, Spacing, BorderRadius } from '@/constants/typography';
import { useTaskById, useApp } from '@/providers/AppProvider';
import Button from '@/components/Button';

const priorityColors = {
  high: Colors.priority.high,
  medium: Colors.priority.medium,
  low: Colors.priority.low,
  none: Colors.priority.none,
};

const priorityLabels = {
  high: 'High Priority',
  medium: 'Medium Priority',
  low: 'Low Priority',
  none: 'No Priority',
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const task = useTaskById(id || '');
  const { toggleTaskComplete, deleteTask, updateTask } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task?.title || '');
  const [editedDescription, setEditedDescription] = useState(task?.description || '');

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Task Not Found' }} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Task not found</Text>
          <Button title="Go Back" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  const handleToggleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toggleTaskComplete(task.id);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteTask(task.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleSaveEdit = () => {
    if (editedTitle.trim()) {
      updateTask(task.id, {
        title: editedTitle.trim(),
        description: editedDescription.trim() || undefined,
      });
      setIsEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (time?: string) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const isCompleted = task.status === 'completed';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Edit3 size={22} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              isCompleted && styles.checkboxCompleted,
              { borderColor: priorityColors[task.priority] },
            ]}
            onPress={handleToggleComplete}
          >
            {isCompleted && (
              <View
                style={[
                  styles.checkInner,
                  { backgroundColor: priorityColors[task.priority] },
                ]}
              >
                <Check size={18} color={Colors.textInverse} strokeWidth={3} />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            {isEditing ? (
              <TextInput
                style={styles.titleInput}
                value={editedTitle}
                onChangeText={setEditedTitle}
                placeholder="Task title"
                placeholderTextColor={Colors.textTertiary}
                autoFocus
              />
            ) : (
              <Text
                style={[styles.title, isCompleted && styles.titleCompleted]}
              >
                {task.title}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Description</Text>
          {isEditing ? (
            <TextInput
              style={styles.descriptionInput}
              value={editedDescription}
              onChangeText={setEditedDescription}
              placeholder="Add a description..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={4}
            />
          ) : (
            <Text style={styles.description}>
              {task.description || 'No description'}
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Calendar size={20} color={Colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={styles.detailValue}>{formatDate(task.dueDate)}</Text>
            </View>
          </View>

          {task.dueTime && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Clock size={20} color={Colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{formatTime(task.dueTime)}</Text>
              </View>
            </View>
          )}

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Flag size={20} color={priorityColors[task.priority]} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Priority</Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: priorityColors[task.priority] },
                ]}
              >
                {priorityLabels[task.priority]}
              </Text>
            </View>
          </View>

          {task.tags && task.tags.length > 0 && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Tag size={20} color={Colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Tags</Text>
                <View style={styles.tagsContainer}>
                  {task.tags.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>

        {isEditing && (
          <View style={styles.editActions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                setIsEditing(false);
                setEditedTitle(task.title);
                setEditedDescription(task.description || '');
              }}
              style={styles.editButton}
            />
            <Button
              title="Save Changes"
              onPress={handleSaveEdit}
              style={styles.editButton}
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
          onPress={handleToggleComplete}
          variant={isCompleted ? 'secondary' : 'primary'}
          icon={<Check size={20} color={isCompleted ? Colors.primary : Colors.textInverse} />}
          style={styles.footerButton}
        />
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Trash2 size={22} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyText: {
    ...Typography.title2,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    marginTop: 4,
  },
  checkboxCompleted: {
    backgroundColor: 'transparent',
  },
  checkInner: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...Typography.title1,
    color: Colors.text,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textTertiary,
  },
  titleInput: {
    ...Typography.title1,
    color: Colors.text,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingBottom: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: {
    ...Typography.footnote,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  descriptionInput: {
    ...Typography.body,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    ...Typography.caption1,
    color: Colors.textTertiary,
  },
  detailValue: {
    ...Typography.body,
    color: Colors.text,
    marginTop: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  tag: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  tagText: {
    ...Typography.caption1,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  editButton: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.md,
  },
  footerButton: {
    flex: 1,
  },
  deleteButton: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
