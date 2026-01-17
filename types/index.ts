export type Priority = 'high' | 'medium' | 'low' | 'none';
export type TaskStatus = 'pending' | 'completed' | 'overdue';
export type TaskCategory = 'work' | 'personal' | 'health' | 'shopping' | 'other';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  priority: Priority;
  status: TaskStatus;
  category: TaskCategory;
  tags?: string[];
  assignedTo?: string[];
  createdAt: string;
  completedAt?: string;
  isRecurring?: boolean;
  recurringPattern?: string;
  createdById?: string;
  updatedById?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isPro?: boolean;
  createdAt: string;
}

export interface Friend {
  id: string;
  user: User;
  status: 'pending' | 'accepted' | 'blocked';
  sharedTasks: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

export interface Notification {
  id: string;
  type: 'task_due' | 'friend_request' | 'task_shared' | 'achievement' | 'reminder';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: 'month' | 'year';
  features: string[];
  isPopular?: boolean;
}

export interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  icon: string;
}
