import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  Calendar,
  Clock,
  Flag,
  Folder,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Typography, Spacing, BorderRadius } from '@/constants/typography';
import { useApp } from '@/providers/AppProvider';
import Button from '@/components/Button';
import { Priority, TaskCategory } from '@/types';

const priorities: { value: Priority; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: Colors.priority.high },
  { value: 'medium', label: 'Medium', color: Colors.priority.medium },
  { value: 'low', label: 'Low', color: Colors.priority.low },
  { value: 'none', label: 'None', color: Colors.priority.none },
];

const categories: { value: TaskCategory; label: string }[] = [
  { value: 'work', label: 'Work' },
  { value: 'personal', label: 'Personal' },
  { value: 'health', label: 'Health' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'other', label: 'Other' },
];

export default function NewTaskScreen() {
  const router = useRouter();
  const { addTask } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<TaskCategory>('personal');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState(''); // Stored as 24-hour format (HH:MM)
  const [timeDisplay, setTimeDisplay] = useState(''); // Display as 12-hour format with AM/PM

  const handleClose = () => {
    router.back();
  };

  const handleCreate = () => {
    if (!title.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    addTask({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      category,
      status: 'pending',
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
    });

    router.back();
  };

  const handlePrioritySelect = (p: Priority) => {
    Haptics.selectionAsync();
    setPriority(p);
  };

  const handleCategorySelect = (c: TaskCategory) => {
    Haptics.selectionAsync();
    setCategory(c);
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getNextWeekDate = () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  };


  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Select date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeTo12Hour = (time24: string): string => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes || '00'} ${ampm}`;
  };

  const formatTimeTo24Hour = (time12: string): string => {
    if (!time12) return '';
    // Handle formats like "9:30 AM", "09:30 PM", "9:30AM", etc.
    const cleanTime = time12.trim().toUpperCase();
    const hasAM = cleanTime.includes('AM');
    const hasPM = cleanTime.includes('PM');
    const timePart = cleanTime.replace(/\s*(AM|PM)/i, '');
    const [hours, minutes = '00'] = timePart.split(':');
    let hour24 = parseInt(hours, 10);
    
    if (hasPM && hour24 !== 12) {
      hour24 += 12;
    } else if (hasAM && hour24 === 12) {
      hour24 = 0;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'New Task',
          headerLeft: () => (
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.titleInput}
            placeholder="What do you need to do?"
            placeholderTextColor={Colors.textTertiary}
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="next"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Add details..."
            placeholderTextColor={Colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Calendar size={18} color={Colors.primary} />
            <Text style={styles.label}>Due Date & Time</Text>
          </View>
          
          {/* Quick Date Buttons */}
          <View style={styles.quickDates}>
            <TouchableOpacity
              style={[
                styles.quickDateButton,
                dueDate === new Date().toISOString().split('T')[0] && styles.quickDateButtonActive,
              ]}
              onPress={() => {
                const today = new Date().toISOString().split('T')[0];
                setDueDate(today);
                Haptics.selectionAsync();
              }}
            >
              <Text
                style={[
                  styles.quickDateText,
                  dueDate === new Date().toISOString().split('T')[0] && styles.quickDateTextActive,
                ]}
              >
                Today
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickDateButton,
                dueDate === getTomorrowDate() && styles.quickDateButtonActive,
              ]}
              onPress={() => {
                const tomorrow = getTomorrowDate();
                setDueDate(tomorrow);
                Haptics.selectionAsync();
              }}
            >
              <Text
                style={[
                  styles.quickDateText,
                  dueDate === getTomorrowDate() && styles.quickDateTextActive,
                ]}
              >
                Tomorrow
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickDateButton,
                dueDate === getNextWeekDate() && styles.quickDateButtonActive,
              ]}
              onPress={() => {
                const nextWeek = getNextWeekDate();
                setDueDate(nextWeek);
                Haptics.selectionAsync();
              }}
            >
              <Text
                style={[
                  styles.quickDateText,
                  dueDate === getNextWeekDate() && styles.quickDateTextActive,
                ]}
              >
                Next Week
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date Input */}
          <View style={styles.dateTimeButton}>
            <Calendar size={18} color={Colors.primary} />
            <TextInput
              style={[styles.dateTimeInput, dueDate && styles.dateTimeTextActive]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textTertiary}
              value={dueDate}
              onChangeText={(text) => {
                // Simple validation for YYYY-MM-DD format
                const formatted = text.replace(/[^0-9-]/g, '');
                if (formatted.length <= 10) {
                  setDueDate(formatted);
                }
              }}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>

          {/* Time Input */}
          <View style={styles.dateTimeButton}>
            <Clock size={18} color={Colors.primary} />
            <TextInput
              style={[styles.dateTimeInput, timeDisplay && styles.dateTimeTextActive]}
              placeholder="9:30 AM"
              placeholderTextColor={Colors.textTertiary}
              value={timeDisplay}
              onChangeText={(text) => {
                // Allow input with AM/PM
                const upperText = text.toUpperCase();
                // Keep only digits, colon, space, A, M, P
                const cleaned = upperText.replace(/[^0-9:\sAPM]/g, '');
                
                // Update display value
                setTimeDisplay(cleaned);
                
                // If it has AM/PM, convert and store as 24-hour format
                if (cleaned.includes('AM') || cleaned.includes('PM')) {
                  const converted = formatTimeTo24Hour(cleaned);
                  if (converted) {
                    setDueTime(converted);
                  }
                }
              }}
              onBlur={() => {
                // Ensure proper format when user finishes
                if (timeDisplay) {
                  let finalTime = timeDisplay.trim().toUpperCase();
                  
                  // If it already has AM/PM, use it
                  if (!finalTime.includes('AM') && !finalTime.includes('PM')) {
                    // If just time without AM/PM, default to AM
                    const timeMatch = finalTime.match(/^(\d{1,2}):(\d{0,2})$/);
                    if (timeMatch) {
                      finalTime = finalTime + ' AM';
                    }
                  }
                  
                  // Convert to 24-hour and store
                  const converted = formatTimeTo24Hour(finalTime);
                  if (converted) {
                    setDueTime(converted);
                    setTimeDisplay(formatTimeTo12Hour(converted));
                  } else {
                    setDueTime('');
                    setTimeDisplay('');
                  }
                } else {
                  setDueTime('');
                  setTimeDisplay('');
                }
              }}
              keyboardType="numbers-and-punctuation"
              maxLength={8}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Flag size={18} color={Colors.primary} />
            <Text style={styles.label}>Priority</Text>
          </View>
          <View style={styles.priorityContainer}>
            {priorities.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.priorityButton,
                  priority === p.value && { backgroundColor: p.color + '20', borderColor: p.color },
                ]}
                onPress={() => handlePrioritySelect(p.value)}
              >
                <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                <Text
                  style={[
                    styles.priorityText,
                    priority === p.value && { color: p.color },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Folder size={18} color={Colors.primary} />
            <Text style={styles.label}>Category</Text>
          </View>
          <View style={styles.categoryContainer}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.value}
                style={[
                  styles.categoryButton,
                  category === c.value && styles.categoryButtonActive,
                ]}
                onPress={() => handleCategorySelect(c.value)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    category === c.value && styles.categoryTextActive,
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Create Task"
          onPress={handleCreate}
          size="large"
          disabled={!title.trim()}
          style={styles.createButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  titleInput: {
    ...Typography.title2,
    color: Colors.text,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    ...Typography.headline,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  descriptionInput: {
    ...Typography.body,
    color: Colors.text,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  quickDates: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickDateButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  quickDateButtonActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  quickDateText: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  quickDateTextActive: {
    color: Colors.primary,
  },
  priorityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  priorityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  priorityText: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryButtonActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  categoryText: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  categoryTextActive: {
    color: Colors.primary,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
  },
  dateTimeText: {
    ...Typography.body,
    color: Colors.textTertiary,
    flex: 1,
  },
  dateTimeInput: {
    ...Typography.body,
    color: Colors.textTertiary,
    flex: 1,
    padding: 0,
  },
  dateTimeTextActive: {
    color: Colors.text,
    fontWeight: '500' as const,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xxxl : Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  createButton: {
    width: '100%',
  },
});
