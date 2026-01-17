import { supabase } from './supabase';
import { Task, TaskStatus, Priority, TaskCategory } from '@/types';

export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date?: string;
  due_time?: string;
  priority: Priority;
  status: TaskStatus;
  category: TaskCategory;
  tags?: string[];
  assigned_to?: string[];
  created_at: string;
  completed_at?: string;
  is_recurring?: boolean;
  recurring_pattern?: string;
  reminders?: string[];
}

/**
 * Task Service for managing tasks in Supabase
 */
export class TaskService {
  /**
   * Map database row to Task type
   */
  private static mapToTask(row: TaskRow & { created_by_id?: string; updated_by_id?: string; updated_at?: string }): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      dueDate: row.due_date || undefined,
      dueTime: row.due_time || undefined,
      priority: row.priority,
      status: row.status,
      category: row.category,
      tags: row.tags || undefined,
      assignedTo: row.assigned_to || undefined,
      createdAt: row.created_at,
      completedAt: row.completed_at || undefined,
      isRecurring: row.is_recurring || undefined,
      recurringPattern: row.recurring_pattern || undefined,
      createdById: row.created_by_id || undefined,
      updatedById: row.updated_by_id || undefined,
      updatedAt: row.updated_at || undefined,
    };
  }

  /**
   * Map Task type to database row
   */
  private static mapToRow(task: Omit<Task, 'id' | 'createdAt'> | Task, userId: string): Omit<TaskRow, 'id' | 'created_at' | 'reminders'> {
    return {
      user_id: userId,
      title: task.title,
      description: task.description || null,
      due_date: task.dueDate || null,
      due_time: task.dueTime || null,
      priority: task.priority,
      status: task.status,
      category: task.category,
      tags: task.tags || null,
      assigned_to: task.assignedTo || null,
      completed_at: task.completedAt || null,
      is_recurring: task.isRecurring || false,
      recurring_pattern: task.recurringPattern || null,
      // reminders field removed - stored in separate reminders table
    };
  }

  /**
   * Get all tasks for a user (including shared tasks)
   */
  static async getTasks(userId: string): Promise<Task[]> {
    try {
      // Get user's own tasks
      const { data: ownTasks, error: ownError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (ownError) {
        console.error('[TaskService] Error fetching own tasks:', ownError);
      }

      // Get shared tasks
      const { data: sharedTaskShares, error: sharedError } = await supabase
        .from('task_shares')
        .select('task_id')
        .eq('shared_with_id', userId);

      let sharedTasks: Task[] = [];
      if (!sharedError && sharedTaskShares && sharedTaskShares.length > 0) {
        const sharedTaskIds = sharedTaskShares.map(s => s.task_id);
        const { data: sharedTasksData, error: sharedTasksError } = await supabase
          .from('tasks')
          .select('*')
          .in('id', sharedTaskIds)
          .order('created_at', { ascending: false });

        if (!sharedTasksError && sharedTasksData) {
          sharedTasks = sharedTasksData.map(this.mapToTask);
        }
      }

      // Combine and deduplicate
      const allTasks = [...(ownTasks || []).map(this.mapToTask), ...sharedTasks];
      const uniqueTasks = Array.from(new Map(allTasks.map(t => [t.id, t])).values());

      return uniqueTasks;
    } catch (error) {
      console.error('[TaskService] Error in getTasks:', error);
      return [];
    }
  }

  /**
   * Get a single task by ID
   */
  static async getTaskById(userId: string, taskId: string): Promise<Task | null> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('[TaskService] Error fetching task:', error);
        return null;
      }

      return this.mapToTask(data);
    } catch (error) {
      console.error('[TaskService] Error in getTaskById:', error);
      return null;
    }
  }

  /**
   * Create a new task
   */
  static async createTask(userId: string, task: Omit<Task, 'id' | 'createdAt'>): Promise<Task | null> {
    try {
      // Ensure required fields are present
      if (!task.title || !task.priority || !task.status || !task.category) {
        console.error('[TaskService] Missing required fields:', { 
          title: task.title, 
          priority: task.priority, 
          status: task.status, 
          category: task.category 
        });
        return null;
      }

      const taskRow = {
        ...this.mapToRow(task, userId),
        created_by_id: userId,
      };

      console.log('[TaskService] Creating task with data:', JSON.stringify(taskRow, null, 2));

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskRow)
        .select()
        .single();

      if (error) {
        console.error('[TaskService] Error creating task:', error);
        console.error('[TaskService] Error code:', error.code);
        console.error('[TaskService] Error message:', error.message);
        console.error('[TaskService] Error details:', error.details);
        console.error('[TaskService] Error hint:', error.hint);
        console.error('[TaskService] Task row being inserted:', JSON.stringify(taskRow, null, 2));
        return null;
      }

      return this.mapToTask(data);
    } catch (error) {
      console.error('[TaskService] Error in createTask:', error);
      return null;
    }
  }

  /**
   * Update an existing task
   */
  static async updateTask(userId: string, taskId: string, updates: Partial<Task>): Promise<Task | null> {
    try {
      const updateRow: Partial<TaskRow> = {};

      if (updates.title !== undefined) updateRow.title = updates.title;
      if (updates.description !== undefined) updateRow.description = updates.description || null;
      if (updates.dueDate !== undefined) updateRow.due_date = updates.dueDate || null;
      if (updates.dueTime !== undefined) updateRow.due_time = updates.dueTime || null;
      if (updates.priority !== undefined) updateRow.priority = updates.priority;
      if (updates.status !== undefined) updateRow.status = updates.status;
      if (updates.category !== undefined) updateRow.category = updates.category;
      if (updates.tags !== undefined) updateRow.tags = updates.tags || null;
      if (updates.assignedTo !== undefined) updateRow.assigned_to = updates.assignedTo || null;
      if (updates.completedAt !== undefined) updateRow.completed_at = updates.completedAt || null;
      if (updates.isRecurring !== undefined) updateRow.is_recurring = updates.isRecurring;
      if (updates.recurringPattern !== undefined) updateRow.recurring_pattern = updates.recurringPattern || null;

      const { data, error } = await supabase
        .from('tasks')
        .update(updateRow)
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('[TaskService] Error updating task:', error);
        return null;
      }

      return this.mapToTask(data);
    } catch (error) {
      console.error('[TaskService] Error in updateTask:', error);
      return null;
    }
  }

  /**
   * Delete a task
   */
  static async deleteTask(userId: string, taskId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) {
        console.error('[TaskService] Error deleting task:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[TaskService] Error in deleteTask:', error);
      return false;
    }
  }

  /**
   * Mark task as complete
   */
  static async completeTask(userId: string, taskId: string): Promise<Task | null> {
    return this.updateTask(userId, taskId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * Mark task as pending
   */
  static async uncompleteTask(userId: string, taskId: string): Promise<Task | null> {
    return this.updateTask(userId, taskId, {
      status: 'pending',
      completedAt: undefined,
    });
  }

  /**
   * Subscribe to real-time task updates
   */
  static subscribeToTasks(
    userId: string,
    callbacks: {
      onInsert?: (task: Task) => void;
      onUpdate?: (task: Task) => void;
      onDelete?: (taskId: string) => void;
    }
  ) {
    const subscription = supabase
      .channel(`tasks:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const task = this.mapToTask(payload.new as TaskRow);
            callbacks.onInsert?.(task);
          } else if (payload.eventType === 'UPDATE') {
            const task = this.mapToTask(payload.new as TaskRow);
            callbacks.onUpdate?.(task);
          } else if (payload.eventType === 'DELETE') {
            callbacks.onDelete?.(payload.old.id);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}
