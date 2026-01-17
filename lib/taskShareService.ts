import { supabase } from './supabase';
import { Task } from '@/types';

export interface TaskShare {
  id: string;
  task_id: string;
  shared_by_id: string;
  shared_with_id: string;
  permission: 'view' | 'edit';
  created_at: string;
}

/**
 * Task Share Service for managing shared tasks and collaboration
 */
export class TaskShareService {
  /**
   * Share a task with a user
   */
  static async shareTask(
    taskId: string,
    sharedById: string,
    sharedWithId: string,
    permission: 'view' | 'edit' = 'view'
  ): Promise<boolean> {
    try {
      // Verify task belongs to sharer
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('user_id')
        .eq('id', taskId)
        .single();

      if (taskError || !task || task.user_id !== sharedById) {
        console.error('[TaskShareService] Task not found or unauthorized');
        return false;
      }

      // Create share
      const { error } = await supabase.from('task_shares').insert({
        task_id: taskId,
        shared_by_id: sharedById,
        shared_with_id: sharedWithId,
        permission,
      });

      if (error) {
        console.error('[TaskShareService] Error sharing task:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[TaskShareService] Error in shareTask:', error);
      return false;
    }
  }

  /**
   * Get shared tasks for a user
   */
  static async getSharedTasks(userId: string): Promise<Task[]> {
    try {
      const { data: shares, error } = await supabase
        .from('task_shares')
        .select('task_id')
        .eq('shared_with_id', userId);

      if (error) {
        console.error('[TaskShareService] Error fetching shared tasks:', error);
        return [];
      }

      if (!shares || shares.length === 0) {
        return [];
      }

      const taskIds = shares.map(s => s.task_id);
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .in('id', taskIds);

      if (tasksError || !tasks) {
        console.error('[TaskShareService] Error fetching task details:', tasksError);
        return [];
      }

      return tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        dueDate: t.due_date,
        dueTime: t.due_time,
        priority: t.priority,
        status: t.status,
        category: t.category,
        tags: t.tags,
        assignedTo: t.assigned_to,
        createdAt: t.created_at,
        completedAt: t.completed_at,
        isRecurring: t.is_recurring,
        recurringPattern: t.recurring_pattern,
        createdById: t.created_by_id,
        updatedById: t.updated_by_id,
        updatedAt: t.updated_at,
      }));
    } catch (error) {
      console.error('[TaskShareService] Error in getSharedTasks:', error);
      return [];
    }
  }

  /**
   * Check if user can edit a task
   */
  static async canEditTask(userId: string, taskId: string): Promise<boolean> {
    try {
      // Check if user owns the task
      const { data: task } = await supabase
        .from('tasks')
        .select('user_id')
        .eq('id', taskId)
        .single();

      if (task && task.user_id === userId) {
        return true;
      }

      // Check if task is shared with edit permission
      const { data: share } = await supabase
        .from('task_shares')
        .select('permission')
        .eq('task_id', taskId)
        .eq('shared_with_id', userId)
        .eq('permission', 'edit')
        .single();

      return !!share;
    } catch (error) {
      console.error('[TaskShareService] Error checking edit permission:', error);
      return false;
    }
  }

  /**
   * Unshare a task
   */
  static async unshareTask(sharedById: string, taskId: string, sharedWithId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('task_shares')
        .delete()
        .eq('task_id', taskId)
        .eq('shared_by_id', sharedById)
        .eq('shared_with_id', sharedWithId);

      if (error) {
        console.error('[TaskShareService] Error unsharing task:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[TaskShareService] Error in unshareTask:', error);
      return false;
    }
  }

  /**
   * Get users who have access to a task
   */
  static async getTaskCollaborators(taskId: string): Promise<Array<{ id: string; name: string; email: string; permission: 'view' | 'edit' }>> {
    try {
      const { data: shares, error } = await supabase
        .from('task_shares')
        .select('shared_with_id, permission')
        .eq('task_id', taskId);

      if (error || !shares) {
        return [];
      }

      const collaboratorIds = shares.map(s => s.shared_with_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', collaboratorIds);

      if (!profiles) {
        return [];
      }

      return shares.map(share => {
        const profile = profiles.find(p => p.id === share.shared_with_id);
        return {
          id: share.shared_with_id,
          name: profile?.name || 'Unknown',
          email: profile?.email || '',
          permission: share.permission,
        };
      });
    } catch (error) {
      console.error('[TaskShareService] Error getting collaborators:', error);
      return [];
    }
  }
}
