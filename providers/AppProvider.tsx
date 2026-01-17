import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, ChatMessage, Notification, TaskStatus } from '@/types';
import { mockTasks, mockChatMessages, mockNotifications } from '@/mocks/data';
import { ChatService } from '@/lib/chatService';
import { TaskService } from '@/lib/taskService';
import { ReminderService } from '@/lib/reminderService';
import { useAuth } from './AuthProvider';

const STORAGE_KEYS = {
  TASKS: 'taskify_tasks',
  ONBOARDING_COMPLETE: 'taskify_onboarding_complete',
  USER: 'taskify_user',
};

export const [AppProvider, useApp] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  // Fetch tasks from Supabase when authenticated, fallback to local storage
  const tasksQuery = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      if (!user?.id || !isAuthenticated) {
        // Fallback to local storage when not authenticated
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
        return stored ? JSON.parse(stored) : mockTasks;
      }
      // Fetch from Supabase
      const tasks = await TaskService.getTasks(user.id);
      return tasks.length > 0 ? tasks : mockTasks;
    },
    enabled: true,
  });

  // Fetch chat messages from Supabase when user is authenticated
  const chatMessagesQuery = useQuery({
    queryKey: ['chatMessages', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const messages = await ChatService.getMessages(user.id);
      return messages.length > 0 ? messages : mockChatMessages;
    },
    enabled: !!isAuthenticated && !!user?.id,
  });

  useEffect(() => {
    if (chatMessagesQuery.data) {
      setChatMessages(chatMessagesQuery.data);
    }
  }, [chatMessagesQuery.data]);

  const onboardingQuery = useQuery({
    queryKey: ['onboarding'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
      return stored === 'true';
    },
  });

  useEffect(() => {
    if (tasksQuery.data) {
      setTasks(tasksQuery.data);
    }
  }, [tasksQuery.data]);

  useEffect(() => {
    if (onboardingQuery.data !== undefined) {
      setHasCompletedOnboarding(onboardingQuery.data);
    }
  }, [onboardingQuery.data]);

  const { mutate: syncTasks } = useMutation({
    mutationFn: async (updatedTasks: Task[]) => {
      // Sync to local storage as backup
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updatedTasks));
      return updatedTasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    },
  });

  const { mutate: completeOnboardingMutate } = useMutation({
    mutationFn: async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
      return true;
    },
    onSuccess: () => {
      setHasCompletedOnboarding(true);
    },
  });

  const addTaskMutation = useMutation({
    mutationFn: async (task: Omit<Task, 'id' | 'createdAt'>) => {
      if (!user?.id || !isAuthenticated) {
        // Fallback to local storage
        const newTask: Task = {
          ...task,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
        };
        const updated = [newTask, ...tasks];
        await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
        return newTask;
      }
      // Create in Supabase
      const created = await TaskService.createTask(user.id, task);
      if (!created) {
        // Fallback to local
        return {
          ...task,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
        } as Task;
      }
      // Create reminders if due date exists
      if (task.dueDate) {
        await ReminderService.createDefaultReminders(user.id, created.id, task.dueDate, task.dueTime);
      }
      return created;
    },
    onSuccess: (newTask) => {
      setTasks(prev => [newTask, ...prev]);
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    },
  });

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt'>) => {
    addTaskMutation.mutate(task);
  }, [addTaskMutation]);

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      if (!user?.id || !isAuthenticated) {
        // Fallback to local storage
        const updated = tasks.map(task =>
          task.id === taskId ? { ...task, ...updates } : task
        );
        await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
        return updated.find(t => t.id === taskId)!;
      }
      const updated = await TaskService.updateTask(user.id, taskId, updates);
      if (!updated) {
        // Fallback to local update
        const localUpdated = tasks.find(t => t.id === taskId);
        return localUpdated ? { ...localUpdated, ...updates } : null;
      }
      return updated;
    },
    onSuccess: (updatedTask) => {
      if (updatedTask) {
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
        queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
      }
    },
  });

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    updateTaskMutation.mutate({ taskId, updates });
  }, [updateTaskMutation]);

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user?.id || !isAuthenticated) {
        // Fallback to local storage
        const updated = tasks.filter(task => task.id !== taskId);
        await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
        return true;
      }
      return await TaskService.deleteTask(user.id, taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    },
  });

  const deleteTask = useCallback((taskId: string) => {
    deleteTaskMutation.mutate(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, [deleteTaskMutation]);

  const toggleTaskComplete = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    const updates: Partial<Task> = {
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
    };
    updateTask(taskId, updates);
  }, [tasks, updateTask]);

  // Mutation to add chat message to Supabase
  const addMessageMutation = useMutation({
    mutationFn: async ({ content, role, taskId }: { content: string; role: 'user' | 'assistant'; taskId?: string }) => {
      if (!user?.id) {
        // Fallback to local state if not authenticated
        return {
          id: Date.now().toString(),
          content,
          role,
          timestamp: new Date().toISOString(),
        } as ChatMessage;
      }
      const message = await ChatService.addMessage(user.id, content, role, taskId);
      if (!message) {
        // Fallback if Supabase insert fails
        return {
          id: Date.now().toString(),
          content,
          role,
          timestamp: new Date().toISOString(),
        } as ChatMessage;
      }
      return message;
    },
    onSuccess: (message) => {
      setChatMessages(prev => [...prev, message]);
      queryClient.invalidateQueries({ queryKey: ['chatMessages', user?.id] });
    },
  });

  const addChatMessage = useCallback((content: string, role: 'user' | 'assistant', taskId?: string) => {
    addMessageMutation.mutate({ content, role, taskId });
  }, [addMessageMutation]);

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  }, []);

  const completeOnboarding = useCallback(() => {
    completeOnboardingMutate();
  }, [completeOnboardingMutate]);

  const todayTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(task => task.dueDate === today && task.status !== 'completed');
  }, [tasks]);

  const upcomingTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(task => task.dueDate && task.dueDate > today && task.status !== 'completed');
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks.filter(task => task.status === 'completed');
  }, [tasks]);

  const overdueTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(task => task.dueDate && task.dueDate < today && task.status !== 'completed');
  }, [tasks]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  // Set up real-time subscription for chat messages
  useEffect(() => {
    if (!user?.id || !isAuthenticated) return;

    const unsubscribe = ChatService.subscribeToMessages(user.id, (newMessage) => {
      setChatMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, isAuthenticated]);

  // Set up real-time subscription for tasks
  useEffect(() => {
    if (!user?.id || !isAuthenticated) return;

    const unsubscribe = TaskService.subscribeToTasks(user.id, {
      onInsert: (newTask) => {
        setTasks(prev => {
          if (prev.some(t => t.id === newTask.id)) {
            return prev;
          }
          return [newTask, ...prev];
        });
      },
      onUpdate: (updatedTask) => {
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
      },
      onDelete: (taskId) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
      },
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, isAuthenticated]);

  return {
    tasks,
    todayTasks,
    upcomingTasks,
    completedTasks,
    overdueTasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    chatMessages,
    addChatMessage,
    notifications,
    markNotificationRead,
    unreadNotificationsCount,
    hasCompletedOnboarding,
    completeOnboarding,
    isLoading: tasksQuery.isLoading || onboardingQuery.isLoading || chatMessagesQuery.isLoading,
  };
});

export function useTaskById(taskId: string) {
  const { tasks } = useApp();
  return useMemo(() => tasks.find(t => t.id === taskId), [tasks, taskId]);
}
