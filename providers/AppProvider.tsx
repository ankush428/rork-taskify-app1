import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, ChatMessage, Notification, TaskStatus } from '@/types';
import { mockTasks, mockChatMessages, mockNotifications } from '@/mocks/data';

const STORAGE_KEYS = {
  TASKS: 'taskify_tasks',
  ONBOARDING_COMPLETE: 'taskify_onboarding_complete',
  USER: 'taskify_user',
};

export const [AppProvider, useApp] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
      return stored ? JSON.parse(stored) : mockTasks;
    },
  });

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
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updatedTasks));
      return updatedTasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newTask, ...tasks];
    setTasks(updated);
    syncTasks(updated);
  }, [tasks, syncTasks]);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    const updated = tasks.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    );
    setTasks(updated);
    syncTasks(updated);
  }, [tasks, syncTasks]);

  const deleteTask = useCallback((taskId: string) => {
    const updated = tasks.filter(task => task.id !== taskId);
    setTasks(updated);
    syncTasks(updated);
  }, [tasks, syncTasks]);

  const toggleTaskComplete = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    const updated: Task[] = tasks.map(t =>
      t.id === taskId ? {
        ...t,
        status: newStatus,
        completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
      } : t
    );
    setTasks(updated);
    syncTasks(updated);
  }, [tasks, syncTasks]);

  const addChatMessage = useCallback((content: string, role: 'user' | 'assistant') => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      content,
      role,
      timestamp: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, message]);
  }, []);

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
    isLoading: tasksQuery.isLoading || onboardingQuery.isLoading,
  };
});

export function useTaskById(taskId: string) {
  const { tasks } = useApp();
  return useMemo(() => tasks.find(t => t.id === taskId), [tasks, taskId]);
}
