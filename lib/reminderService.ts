import { supabase } from './supabase';
import * as Notifications from 'expo-notifications';

export interface Reminder {
  id: string;
  task_id: string;
  user_id: string;
  reminder_time: string;
  reminder_type: 'due_date' | 'custom' | 'recurring';
  is_sent: boolean;
  created_at: string;
}

/**
 * Reminder Service for managing task reminders and notifications
 */
export class ReminderService {
  /**
   * Configure notification handler
   */
  static async configureNotifications() {
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }

  /**
   * Schedule a reminder for a task
   */
  static async scheduleReminder(
    userId: string,
    taskId: string,
    reminderTime: string,
    reminderType: 'due_date' | 'custom' | 'recurring' = 'custom'
  ): Promise<boolean> {
    try {
      // Save reminder to database
      const { error: dbError } = await supabase.from('reminders').insert({
        user_id: userId,
        task_id: taskId,
        reminder_time: reminderTime,
        reminder_type: reminderType,
        is_sent: false,
      });

      if (dbError) {
        console.error('[ReminderService] Error saving reminder:', dbError);
        return false;
      }

      // Schedule local notification
      await this.scheduleNotification(taskId, reminderTime);

      return true;
    } catch (error) {
      console.error('[ReminderService] Error scheduling reminder:', error);
      return false;
    }
  }

  /**
   * Schedule local notification
   */
  private static async scheduleNotification(taskId: string, reminderTime: string) {
    const triggerDate = new Date(reminderTime);
    const now = new Date();

    // Only schedule if reminder is in the future
    if (triggerDate <= now) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Task Reminder',
        body: 'You have a task due soon!',
        data: { taskId },
        sound: true,
      },
      trigger: triggerDate,
    });
  }

  /**
   * Cancel a reminder
   */
  static async cancelReminder(reminderId: string): Promise<boolean> {
    try {
      // Mark as sent/cancelled in database
      const { error } = await supabase
        .from('reminders')
        .update({ is_sent: true })
        .eq('id', reminderId);

      if (error) {
        console.error('[ReminderService] Error cancelling reminder:', error);
        return false;
      }

      // Cancel local notification (if possible)
      await Notifications.cancelScheduledNotificationAsync(reminderId);

      return true;
    } catch (error) {
      console.error('[ReminderService] Error cancelling reminder:', error);
      return false;
    }
  }

  /**
   * Get all reminders for a task
   */
  static async getTaskReminders(userId: string, taskId: string): Promise<Reminder[]> {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .eq('task_id', taskId)
        .eq('is_sent', false)
        .order('reminder_time', { ascending: true });

      if (error) {
        console.error('[ReminderService] Error fetching reminders:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[ReminderService] Error in getTaskReminders:', error);
      return [];
    }
  }

  /**
   * Create default reminders for a task (based on due date)
   */
  static async createDefaultReminders(
    userId: string,
    taskId: string,
    dueDate?: string,
    dueTime?: string
  ): Promise<boolean> {
    if (!dueDate) return false;

    try {
      const dueDateTime = dueTime
        ? `${dueDate}T${dueTime}:00`
        : `${dueDate}T09:00:00`;

      const dueDateObj = new Date(dueDateTime);
      
      // Create reminders: 1 day before, 1 hour before, and at due time
      const reminders: string[] = [];

      // 1 day before
      const oneDayBefore = new Date(dueDateObj);
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);
      reminders.push(oneDayBefore.toISOString());

      // 1 hour before (if due time exists)
      if (dueTime) {
        const oneHourBefore = new Date(dueDateObj);
        oneHourBefore.setHours(oneHourBefore.getHours() - 1);
        reminders.push(oneHourBefore.toISOString());
      }

      // At due time
      reminders.push(dueDateObj.toISOString());

      // Schedule all reminders
      for (const reminderTime of reminders) {
        await this.scheduleReminder(userId, taskId, reminderTime, 'due_date');
      }

      return true;
    } catch (error) {
      console.error('[ReminderService] Error creating default reminders:', error);
      return false;
    }
  }
}
