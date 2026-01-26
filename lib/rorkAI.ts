import { useState, useCallback } from 'react';
import { createRorkTool, useRorkAgent } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { Task, Priority, TaskCategory } from '@/types';

export interface UseTaskAIOptions {
  tasks: Task[];
  todayTasks: Task[];
  upcomingTasks: Task[];
  overdueTasks: Task[];
  completedTasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleComplete: (taskId: string) => void;
}

export function useTaskAI(options: UseTaskAIOptions) {
  const {
    tasks,
    todayTasks,
    upcomingTasks,
    overdueTasks,
    completedTasks,
    onAddTask,
    onUpdateTask,
    onDeleteTask,
    onToggleComplete,
  } = options;

  const agent = useRorkAgent({
    tools: {
      createTask: createRorkTool({
        description: "Create a new task for the user. Use this when user asks to add, create, or schedule a task.",
        zodSchema: z.object({
          title: z.string().describe("The task title - should be clear and actionable"),
          description: z.string().optional().describe("Optional detailed description of the task"),
          dueDate: z.string().optional().describe("Due date in YYYY-MM-DD format"),
          dueTime: z.string().optional().describe("Due time in HH:MM format (24-hour)"),
          priority: z.enum(['high', 'medium', 'low', 'none']).default('medium').describe("Priority level"),
          category: z.enum(['work', 'personal', 'health', 'shopping', 'other']).default('personal').describe("Task category"),
          isRecurring: z.boolean().optional().describe("Whether the task repeats"),
          recurringPattern: z.string().optional().describe("Recurrence pattern like 'daily', 'weekly', 'monthly'"),
        }),
        execute(input) {
          console.log('[RorkAI] Creating task:', input);
          onAddTask({
            title: input.title,
            description: input.description,
            dueDate: input.dueDate,
            dueTime: input.dueTime,
            priority: input.priority as Priority,
            category: (input.category || 'personal') as TaskCategory,
            status: 'pending',
            isRecurring: input.isRecurring,
            recurringPattern: input.recurringPattern,
          });
          return { success: true, message: `Task "${input.title}" created successfully` };
        },
      }),

      listTasks: createRorkTool({
        description: "List tasks for the user. Use this when user asks about their tasks, what's due, or wants to see their schedule.",
        zodSchema: z.object({
          filter: z.enum(['all', 'today', 'upcoming', 'overdue', 'completed']).default('all').describe("Which tasks to show"),
          limit: z.number().optional().describe("Maximum number of tasks to return"),
        }),
        execute(input) {
          console.log('[RorkAI] Listing tasks with filter:', input.filter);
          let filteredTasks: Task[] = [];
          
          switch (input.filter) {
            case 'today':
              filteredTasks = todayTasks;
              break;
            case 'upcoming':
              filteredTasks = upcomingTasks;
              break;
            case 'overdue':
              filteredTasks = overdueTasks;
              break;
            case 'completed':
              filteredTasks = completedTasks;
              break;
            default:
              filteredTasks = tasks;
          }

          const limitedTasks = input.limit ? filteredTasks.slice(0, input.limit) : filteredTasks;
          
          return {
            count: limitedTasks.length,
            totalCount: filteredTasks.length,
            tasks: limitedTasks.map(t => ({
              id: t.id,
              title: t.title,
              description: t.description,
              dueDate: t.dueDate,
              dueTime: t.dueTime,
              priority: t.priority,
              status: t.status,
              category: t.category,
            })),
          };
        },
      }),

      completeTask: createRorkTool({
        description: "Mark a task as completed or uncompleted. Use when user says they finished a task or wants to mark it done.",
        zodSchema: z.object({
          taskId: z.string().describe("The ID of the task to complete"),
          taskTitle: z.string().optional().describe("The title of the task (for confirmation)"),
        }),
        execute(input) {
          console.log('[RorkAI] Toggling task completion:', input.taskId);
          const task = tasks.find(t => t.id === input.taskId);
          if (!task) {
            return { success: false, message: "Task not found" };
          }
          onToggleComplete(input.taskId);
          const newStatus = task.status === 'completed' ? 'pending' : 'completed';
          return { 
            success: true, 
            message: `Task "${task.title}" marked as ${newStatus}` 
          };
        },
      }),

      updateTask: createRorkTool({
        description: "Update an existing task. Use when user wants to change task details like due date, priority, or description.",
        zodSchema: z.object({
          taskId: z.string().describe("The ID of the task to update"),
          title: z.string().optional().describe("New title"),
          description: z.string().optional().describe("New description"),
          dueDate: z.string().optional().describe("New due date in YYYY-MM-DD format"),
          dueTime: z.string().optional().describe("New due time in HH:MM format"),
          priority: z.enum(['high', 'medium', 'low', 'none']).optional().describe("New priority"),
          category: z.enum(['work', 'personal', 'health', 'shopping', 'other']).optional().describe("New category"),
        }),
        execute(input) {
          console.log('[RorkAI] Updating task:', input.taskId);
          const { taskId, ...updates } = input;
          const task = tasks.find(t => t.id === taskId);
          if (!task) {
            return { success: false, message: "Task not found" };
          }
          onUpdateTask(taskId, updates as Partial<Task>);
          return { success: true, message: `Task "${task.title}" updated successfully` };
        },
      }),

      deleteTask: createRorkTool({
        description: "Delete a task permanently. Use when user explicitly asks to delete or remove a task.",
        zodSchema: z.object({
          taskId: z.string().describe("The ID of the task to delete"),
          taskTitle: z.string().optional().describe("The title of the task (for confirmation)"),
        }),
        execute(input) {
          console.log('[RorkAI] Deleting task:', input.taskId);
          const task = tasks.find(t => t.id === input.taskId);
          if (!task) {
            return { success: false, message: "Task not found" };
          }
          onDeleteTask(input.taskId);
          return { success: true, message: `Task "${task.title}" deleted` };
        },
      }),

      getTaskSummary: createRorkTool({
        description: "Get a summary of the user's tasks and productivity. Use when user asks about their progress or wants an overview.",
        zodSchema: z.object({}),
        execute() {
          console.log('[RorkAI] Getting task summary');
          const today = new Date().toISOString().split('T')[0];
          const completedToday = completedTasks.filter(t => 
            t.completedAt && t.completedAt.split('T')[0] === today
          ).length;

          return {
            totalTasks: tasks.length,
            todayCount: todayTasks.length,
            upcomingCount: upcomingTasks.length,
            overdueCount: overdueTasks.length,
            completedCount: completedTasks.length,
            completedToday,
            highPriorityPending: tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length,
          };
        },
      }),

      findTask: createRorkTool({
        description: "Search for a task by title or keywords. Use when user refers to a specific task by name.",
        zodSchema: z.object({
          query: z.string().describe("Search query - task title or keywords"),
        }),
        execute(input) {
          console.log('[RorkAI] Finding task:', input.query);
          const query = input.query.toLowerCase();
          const matches = tasks.filter(t => 
            t.title.toLowerCase().includes(query) ||
            (t.description && t.description.toLowerCase().includes(query))
          );
          
          if (matches.length === 0) {
            return { found: false, message: "No tasks found matching your query" };
          }

          return {
            found: true,
            count: matches.length,
            tasks: matches.slice(0, 5).map(t => ({
              id: t.id,
              title: t.title,
              description: t.description,
              dueDate: t.dueDate,
              priority: t.priority,
              status: t.status,
            })),
          };
        },
      }),
    },
  });

  return agent;
}

export async function transcribeAudio(audioUri: string, fileType: string): Promise<string> {
  console.log('[RorkAI] Transcribing audio:', audioUri);
  
  const formData = new FormData();
  
  const audioFile = {
    uri: audioUri,
    name: `recording.${fileType}`,
    type: `audio/${fileType}`,
  };
  
  formData.append('audio', audioFile as unknown as Blob);

  try {
    const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`STT request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('[RorkAI] Transcription result:', data);
    return data.text;
  } catch (error) {
    console.error('[RorkAI] Transcription error:', error);
    throw error;
  }
}
