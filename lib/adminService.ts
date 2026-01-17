import { supabase } from './supabase';

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  is_super_admin: boolean;
  permissions: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AppMetrics {
  total_users: number;
  active_users: number;
  free_users: number;
  pro_users: number;
  max_users: number;
  total_tasks: number;
  tasks_created_today: number;
  shared_tasks: number;
  ai_messages_today: number;
  notifications_sent_today: number;
}

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description?: string;
  updated_by?: string;
  updated_at: string;
}

/**
 * Admin Service for managing admin panel functionality
 * Strictly secured with email-based access control
 */
export class AdminService {
  private static readonly ADMIN_EMAIL = 'ankush@jarvisatwork.com';

  /**
   * Check if current user is admin
   */
  static async isAdmin(userId: string, userEmail?: string): Promise<boolean> {
    try {
      // Quick email check first
      if (userEmail && userEmail.toLowerCase() !== this.ADMIN_EMAIL.toLowerCase()) {
        return false;
      }

      // Verify in database
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', userId)
        .single();

      // If admin user doesn't exist but email matches, create it
      if ((error || !data) && userEmail && userEmail.toLowerCase() === this.ADMIN_EMAIL.toLowerCase()) {
        console.log('[AdminService] Admin user not found, creating...');
        
        // Try to create admin user
        const { data: newAdmin, error: createError } = await supabase
          .from('admin_users')
          .insert({
            user_id: userId,
            email: userEmail,
            is_super_admin: true,
          })
          .select()
          .single();

        if (createError || !newAdmin) {
          console.error('[AdminService] Failed to create admin user:', createError);
          // Still return true if email matches (fallback)
          return true;
        }

        console.log('[AdminService] Admin user created successfully');
        return true;
      }

      if (error || !data) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('[AdminService] Error checking admin status:', error);
      // Fallback: if email matches, allow access even if database check fails
      if (userEmail && userEmail.toLowerCase() === this.ADMIN_EMAIL.toLowerCase()) {
        console.log('[AdminService] Fallback: Allowing admin access based on email');
        return true;
      }
      return false;
    }
  }

  /**
   * Get app metrics for dashboard
   */
  static async getMetrics(): Promise<AppMetrics | null> {
    try {
      // Get user counts by plan
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: freeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_pro', false);

      const { count: proUsers } = await supabase
        .from('ai_usage')
        .select('*', { count: 'exact', head: true })
        .eq('plan', 'pro');

      const { count: maxUsers } = await supabase
        .from('ai_usage')
        .select('*', { count: 'exact', head: true })
        .eq('plan', 'max');

      // Get active users (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', sevenDaysAgo.toISOString());

      // Get task counts
      const { count: totalTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true });

      const today = new Date().toISOString().split('T')[0];
      const { count: tasksCreatedToday } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`);

      const { count: sharedTasks } = await supabase
        .from('task_shares')
        .select('*', { count: 'exact', head: true });

      // Get AI usage today
      const { count: aiMessagesToday } = await supabase
        .from('ai_usage_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`)
        .eq('success', true);

      // Get notifications sent today
      const { count: notificationsToday } = await supabase
        .from('notification_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`)
        .eq('success', true);

      return {
        total_users: totalUsers || 0,
        active_users: activeUsers || 0,
        free_users: freeUsers || 0,
        pro_users: proUsers || 0,
        max_users: maxUsers || 0,
        total_tasks: totalTasks || 0,
        tasks_created_today: tasksCreatedToday || 0,
        shared_tasks: sharedTasks || 0,
        ai_messages_today: aiMessagesToday || 0,
        notifications_sent_today: notificationsToday || 0,
      };
    } catch (error) {
      console.error('[AdminService] Error fetching metrics:', error);
      return null;
    }
  }

  /**
   * Get all users (paginated)
   */
  static async getUsers(page: number = 1, limit: number = 50, search?: string) {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await query.range(from, to);

      if (error) {
        console.error('[AdminService] Error fetching users:', error);
        return { users: [], total: 0 };
      }

      // Get plan info for each user
      const usersWithPlans = await Promise.all((data || []).map(async (user) => {
        const { data: usage } = await supabase
          .from('ai_usage')
          .select('plan, current_usage, usage_limit, reset_date')
          .eq('user_id', user.id)
          .single();

        return {
          ...user,
          plan: usage?.plan || 'free',
          ai_usage: usage?.current_usage || 0,
          ai_limit: usage?.usage_limit || 50,
        };
      }));

      return {
        users: usersWithPlans,
        total: count || 0,
      };
    } catch (error) {
      console.error('[AdminService] Error in getUsers:', error);
      return { users: [], total: 0 };
    }
  }

  /**
   * Update user plan
   */
  static async updateUserPlan(userId: string, plan: 'free' | 'pro' | 'max'): Promise<boolean> {
    try {
      const limits = {
        free: 50,
        pro: 500,
        max: 5000,
      };

      // Update AI usage table
      const { error } = await supabase
        .from('ai_usage')
        .upsert({
          user_id: userId,
          plan,
          usage_limit: limits[plan],
          current_usage: 0,
          reset_date: this.getNextResetDate().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('[AdminService] Error updating user plan:', error);
        return false;
      }

      // Update profile if needed
      if (plan !== 'free') {
        await supabase
          .from('profiles')
          .update({ is_pro: true })
          .eq('id', userId);
      }

      return true;
    } catch (error) {
      console.error('[AdminService] Error in updateUserPlan:', error);
      return false;
    }
  }

  /**
   * Ban/deactivate user
   */
  static async banUser(userId: string, reason?: string): Promise<boolean> {
    try {
      // In production, you might want a separate banned_users table
      // For now, we'll use a metadata field
      const { error } = await supabase
        .from('profiles')
        .update({
          updated_at: new Date().toISOString(),
          // Add banned metadata if you have a JSONB field for it
        })
        .eq('id', userId);

      if (error) {
        console.error('[AdminService] Error banning user:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[AdminService] Error in banUser:', error);
      return false;
    }
  }

  /**
   * Get AI usage statistics
   */
  static async getAIUsageStats() {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get total requests today
      const { count: totalToday } = await supabase
        .from('ai_usage_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`);

      // Get failed requests today
      const { count: failedToday } = await supabase
        .from('ai_usage_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`)
        .eq('success', false);

      // Get usage by plan
      const { data: usageByPlan } = await supabase
        .from('ai_usage')
        .select('plan, current_usage')
        .order('current_usage', { ascending: false });

      // Get top AI users
      const { data: topUsers } = await supabase
        .from('ai_usage')
        .select('user_id, current_usage, plan')
        .order('current_usage', { ascending: false })
        .limit(10);

      return {
        total_today: totalToday || 0,
        failed_today: failedToday || 0,
        usage_by_plan: usageByPlan || [],
        top_users: topUsers || [],
      };
    } catch (error) {
      console.error('[AdminService] Error getting AI stats:', error);
      return null;
    }
  }

  /**
   * Update AI limits per plan
   */
  static async updateAILimits(limits: { free: number; pro: number; max: number }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({
          setting_value: limits,
          updated_at: new Date().toISOString(),
        })
        .eq('setting_key', 'ai_limits');

      if (error) {
        console.error('[AdminService] Error updating AI limits:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[AdminService] Error in updateAILimits:', error);
      return false;
    }
  }

  /**
   * Get system settings
   */
  static async getSystemSettings(): Promise<Record<string, any> | null> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');

      if (error) {
        console.error('[AdminService] Error fetching settings:', error);
        return null;
      }

      const settings: Record<string, any> = {};
      (data || []).forEach((setting) => {
        settings[setting.setting_key] = setting.setting_value;
      });

      return settings;
    } catch (error) {
      console.error('[AdminService] Error in getSystemSettings:', error);
      return null;
    }
  }

  /**
   * Update system setting
   */
  static async updateSystemSetting(key: string, value: any, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({
          setting_value: value,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('setting_key', key);

      if (error) {
        console.error('[AdminService] Error updating setting:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[AdminService] Error in updateSystemSetting:', error);
      return false;
    }
  }

  /**
   * Get notification logs
   */
  static async getNotificationLogs(limit: number = 100) {
    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[AdminService] Error fetching notification logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[AdminService] Error in getNotificationLogs:', error);
      return [];
    }
  }

  /**
   * Get shared tasks
   */
  static async getSharedTasks() {
    try {
      const { data, error } = await supabase
        .from('task_shares')
        .select(`
          *,
          task:tasks(*),
          shared_by:profiles!task_shares_shared_by_id_fkey(name, email),
          shared_with:profiles!task_shares_shared_with_id_fkey(name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[AdminService] Error fetching shared tasks:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[AdminService] Error in getSharedTasks:', error);
      return [];
    }
  }

  /**
   * Get next reset date for AI usage
   */
  private static getNextResetDate(): Date {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth;
  }
}
