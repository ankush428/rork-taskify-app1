import { supabase } from './supabase';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface NotificationSettings {
  id: string;
  user_id: string;
  task_reminders: boolean;
  overdue_tasks: boolean;
  shared_task_updates: boolean;
  daily_summaries: boolean;
  friend_requests: boolean;
  push_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type NotificationType = 'task_reminder' | 'overdue_task' | 'shared_task_update' | 'daily_summary' | 'friend_request';

/**
 * Notification Service for managing push notifications and settings
 * Implements notification rules: only task reminders, overdue tasks, shared updates, and daily summaries
 * AI suggestions appear in chat only, not as push notifications
 */
export class NotificationService {
  /**
   * Configure notification handler
   */
  static async configure() {
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }

  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.error('[NotificationService] Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Get notification settings for user
   */
  static async getSettings(userId: string): Promise<NotificationSettings | null> {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[NotificationService] Error fetching settings:', error);
        return null;
      }

      if (!data) {
        // Create default settings
        return await this.createDefaultSettings(userId);
      }

      return data;
    } catch (error) {
      console.error('[NotificationService] Error in getSettings:', error);
      return null;
    }
  }

  /**
   * Create default notification settings
   */
  private static async createDefaultSettings(userId: string): Promise<NotificationSettings | null> {
    try {
      const defaultSettings = {
        user_id: userId,
        task_reminders: true,
        overdue_tasks: true,
        shared_task_updates: true,
        daily_summaries: false,
        friend_requests: true,
        push_enabled: true,
      };

      const { data, error } = await supabase
        .from('notification_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (error) {
        console.error('[NotificationService] Error creating settings:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[NotificationService] Error in createDefaultSettings:', error);
      return null;
    }
  }

  /**
   * Update notification settings
   */
  static async updateSettings(
    userId: string,
    updates: Partial<Omit<NotificationSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('[NotificationService] Error updating settings:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NotificationService] Error in updateSettings:', error);
      return false;
    }
  }

  /**
   * Send notification if allowed by settings and type
   */
  static async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Get user settings
      const settings = await this.getSettings(userId);
      if (!settings || !settings.push_enabled) {
        return false;
      }

      // Check if this notification type is enabled
      const typeAllowed = {
        task_reminder: settings.task_reminders,
        overdue_task: settings.overdue_tasks,
        shared_task_update: settings.shared_task_updates,
        daily_summary: settings.daily_summaries,
        friend_request: settings.friend_requests,
      };

      if (!typeAllowed[type]) {
        return false; // Notification type is disabled
      }

      // Check permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      // Schedule notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type, ...data },
          sound: true,
        },
        trigger: null, // Show immediately
      });

      return true;
    } catch (error) {
      console.error('[NotificationService] Error sending notification:', error);
      return false;
    }
  }

  /**
   * Schedule task reminder notification
   */
  static async scheduleTaskReminder(
    userId: string,
    taskId: string,
    taskTitle: string,
    reminderTime: Date
  ): Promise<string | null> {
    try {
      const settings = await this.getSettings(userId);
      if (!settings || !settings.push_enabled || !settings.task_reminders) {
        return null;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Task Reminder',
          body: `"${taskTitle}" is due soon!`,
          data: { type: 'task_reminder', taskId },
          sound: true,
        },
        trigger: reminderTime,
      });

      return notificationId;
    } catch (error) {
      console.error('[NotificationService] Error scheduling reminder:', error);
      return null;
    }
  }

  /**
   * Send overdue task notification
   */
  static async sendOverdueTaskNotification(
    userId: string,
    taskId: string,
    taskTitle: string
  ): Promise<boolean> {
    return this.sendNotification(
      userId,
      'overdue_task',
      'Task Overdue',
      `"${taskTitle}" is now overdue`,
      { taskId }
    );
  }

  /**
   * Send shared task update notification
   */
  static async sendSharedTaskUpdateNotification(
    userId: string,
    taskId: string,
    taskTitle: string,
    updaterName: string
  ): Promise<boolean> {
    return this.sendNotification(
      userId,
      'shared_task_update',
      'Task Updated',
      `${updaterName} updated "${taskTitle}"`,
      { taskId }
    );
  }

  /**
   * Send friend request notification
   */
  static async sendFriendRequestNotification(
    userId: string,
    requesterName: string
  ): Promise<boolean> {
    return this.sendNotification(
      userId,
      'friend_request',
      'New Friend Request',
      `${requesterName} wants to be your friend`,
      { type: 'friend_request' }
    );
  }

  /**
   * Cancel scheduled notification
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('[NotificationService] Error cancelling notification:', error);
    }
  }

  /**
   * Cancel all notifications for a task
   */
  static async cancelTaskNotifications(taskId: string): Promise<void> {
    try {
      const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const taskNotifications = allNotifications.filter(
        (n) => n.content.data?.taskId === taskId
      );

      for (const notification of taskNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    } catch (error) {
      console.error('[NotificationService] Error cancelling task notifications:', error);
    }
  }

  /**
   * Set up notification listeners
   */
  static setupListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationTapped: (response: Notifications.NotificationResponse) => void
  ) {
    // Foreground notification handler
    const receivedSubscription = Notifications.addNotificationReceivedListener(
      onNotificationReceived
    );

    // Background/quit notification handler
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      onNotificationTapped
    );

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }
}
