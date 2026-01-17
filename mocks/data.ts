import { Task, User, Friend, ChatMessage, Notification, PricingPlan, OnboardingSlide } from '@/types';

export const currentUser: User = {
  id: '1',
  name: 'Alex Johnson',
  email: 'alex@example.com',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  isPro: false,
  createdAt: '2024-01-01',
};

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Review project proposal',
    description: 'Go through the new project proposal and provide feedback',
    dueDate: '2026-01-17',
    dueTime: '14:00',
    priority: 'high',
    status: 'pending',
    category: 'work',
    tags: ['urgent', 'review'],
    createdAt: '2026-01-15',
  },
  {
    id: '2',
    title: 'Morning workout',
    description: '30 min cardio + strength training',
    dueDate: '2026-01-17',
    dueTime: '07:00',
    priority: 'medium',
    status: 'completed',
    category: 'health',
    tags: ['fitness'],
    createdAt: '2026-01-10',
    completedAt: '2026-01-17T07:30:00',
  },
  {
    id: '3',
    title: 'Buy groceries',
    description: 'Milk, eggs, bread, vegetables, fruits',
    dueDate: '2026-01-18',
    priority: 'low',
    status: 'pending',
    category: 'shopping',
    createdAt: '2026-01-16',
  },
  {
    id: '4',
    title: 'Team meeting',
    description: 'Weekly sync with the development team',
    dueDate: '2026-01-19',
    dueTime: '10:00',
    priority: 'high',
    status: 'pending',
    category: 'work',
    tags: ['meeting', 'team'],
    createdAt: '2026-01-14',
  },
  {
    id: '5',
    title: 'Call mom',
    dueDate: '2026-01-15',
    priority: 'medium',
    status: 'overdue',
    category: 'personal',
    createdAt: '2026-01-10',
  },
  {
    id: '6',
    title: 'Prepare presentation',
    description: 'Q1 results presentation for stakeholders',
    dueDate: '2026-01-20',
    priority: 'high',
    status: 'pending',
    category: 'work',
    tags: ['presentation', 'q1'],
    createdAt: '2026-01-12',
  },
  {
    id: '7',
    title: 'Dentist appointment',
    description: 'Annual checkup at Dr. Smith',
    dueDate: '2026-01-22',
    dueTime: '15:30',
    priority: 'medium',
    status: 'pending',
    category: 'health',
    createdAt: '2026-01-05',
  },
  {
    id: '8',
    title: 'Read book chapter',
    description: 'Finish chapter 5 of "Atomic Habits"',
    dueDate: '2026-01-17',
    priority: 'low',
    status: 'completed',
    category: 'personal',
    tags: ['reading'],
    createdAt: '2026-01-15',
    completedAt: '2026-01-17T20:00:00',
  },
];

export const mockFriends: Friend[] = [
  {
    id: '1',
    user: {
      id: '2',
      name: 'Sarah Miller',
      email: 'sarah@example.com',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
      createdAt: '2024-02-01',
    },
    status: 'accepted',
    sharedTasks: 5,
  },
  {
    id: '2',
    user: {
      id: '3',
      name: 'Mike Chen',
      email: 'mike@example.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      createdAt: '2024-03-01',
    },
    status: 'accepted',
    sharedTasks: 12,
  },
  {
    id: '3',
    user: {
      id: '4',
      name: 'Emma Wilson',
      email: 'emma@example.com',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      createdAt: '2024-04-01',
    },
    status: 'pending',
    sharedTasks: 0,
  },
];

export const mockChatMessages: ChatMessage[] = [
  {
    id: '1',
    content: 'Hi! How can I help you organize your tasks today?',
    role: 'assistant',
    timestamp: '2026-01-17T09:00:00',
  },
  {
    id: '2',
    content: 'What tasks do I have due today?',
    role: 'user',
    timestamp: '2026-01-17T09:01:00',
  },
  {
    id: '3',
    content: 'You have 2 tasks due today:\n\n1. **Review project proposal** (High priority) - Due at 2:00 PM\n2. **Morning workout** (Medium priority) - Already completed!\n\nWould you like me to help you prioritize or reschedule any tasks?',
    role: 'assistant',
    timestamp: '2026-01-17T09:01:05',
  },
];

export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'task_due',
    title: 'Task Due Soon',
    message: '"Review project proposal" is due in 2 hours',
    timestamp: '2026-01-17T12:00:00',
    isRead: false,
  },
  {
    id: '2',
    type: 'friend_request',
    title: 'New Friend Request',
    message: 'Emma Wilson wants to connect with you',
    timestamp: '2026-01-17T10:30:00',
    isRead: false,
  },
  {
    id: '3',
    type: 'task_shared',
    title: 'Task Shared',
    message: 'Sarah shared "Team meeting" with you',
    timestamp: '2026-01-16T15:00:00',
    isRead: true,
  },
  {
    id: '4',
    type: 'achievement',
    title: 'Achievement Unlocked!',
    message: 'You completed 10 tasks this week!',
    timestamp: '2026-01-15T20:00:00',
    isRead: true,
  },
];

export const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'month',
    features: [
      'Up to 50 tasks',
      'Basic AI assistance',
      '2 shared projects',
      'Mobile app access',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    period: 'month',
    features: [
      'Unlimited tasks',
      'Advanced AI assistant',
      'Unlimited shared projects',
      'Priority support',
      'Custom categories',
      'Calendar integration',
    ],
    isPopular: true,
  },
  {
    id: 'max',
    name: 'Max',
    price: 19.99,
    period: 'month',
    features: [
      'Everything in Pro',
      'Team workspaces',
      'Advanced analytics',
      'API access',
      'White-label options',
      'Dedicated support',
    ],
  },
];

export const onboardingSlides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Organize Your Life',
    description: 'Create, manage, and complete tasks with ease. Stay on top of everything that matters.',
    icon: 'CheckSquare',
  },
  {
    id: '2',
    title: 'AI-Powered Assistance',
    description: 'Let our smart assistant help you prioritize, plan, and achieve your goals faster.',
    icon: 'Sparkles',
  },
  {
    id: '3',
    title: 'Collaborate Seamlessly',
    description: 'Share tasks with friends and colleagues. Work together to accomplish more.',
    icon: 'Users',
  },
];
