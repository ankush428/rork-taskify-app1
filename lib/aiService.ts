import { supabase } from './supabase';
import { Task, Priority } from '@/types';

export interface ExtractedTask {
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  priority: Priority;
  category?: 'work' | 'personal' | 'health' | 'shopping' | 'other';
  isRecurring?: boolean;
  recurringPattern?: string;
  reminders?: string[];
  collaborators?: string[];
}

export interface AIUsageLimit {
  plan: 'free' | 'pro' | 'max';
  aiRequestsPerMonth: number;
  currentUsage: number;
  resetDate: string;
}

export interface AIResponse {
  reply: string;
  extractedTasks?: ExtractedTask[];
  requiresConfirmation?: boolean;
}

/**
 * AI Service for processing chat messages and extracting task information
 * This integrates with Supabase Edge Functions for secure AI processing
 */
export class AIService {
  /**
   * Process a user message and generate AI response with task extraction
   */
  static async processMessage(
    userId: string,
    message: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<AIResponse> {
    try {
      // Check usage limits first
      const canUseAI = await this.checkUsageLimit(userId);
      if (!canUseAI.allowed) {
        return {
          reply: canUseAI.message || 'You have reached your AI usage limit for this month. Please upgrade to Pro or Max plan for more AI requests.',
          requiresConfirmation: false,
        };
      }

      // Call Supabase Edge Function for AI processing
      const { data, error } = await supabase.functions.invoke('process-chat-message', {
        body: {
          message,
          conversationHistory,
          userId,
        },
      });

      if (error) {
        console.error('[AIService] Error calling edge function:', error);
        // Fallback to local processing if edge function fails
        return this.processMessageLocally(message, conversationHistory);
      }

      // Increment usage after successful AI call
      await this.incrementUsage(userId);

      return data as AIResponse;
    } catch (error) {
      console.error('[AIService] Error processing message:', error);
      // Fallback to local processing
      return this.processMessageLocally(message, conversationHistory);
    }
  }

  /**
   * Check if user can use AI based on their plan
   */
  static async checkUsageLimit(userId: string): Promise<{ allowed: boolean; message?: string }> {
    try {
      const { data, error } = await supabase
        .from('ai_usage')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[AIService] Error checking usage:', error);
        return { allowed: true }; // Allow if we can't check
      }

      if (!data) {
        // First time user, create usage record
        const userPlan = await this.getUserPlan(userId);
        const limits = this.getPlanLimits(userPlan);
        await this.createUsageRecord(userId, userPlan);
        return { allowed: true };
      }

      // Check if reset date has passed
      const resetDate = new Date(data.reset_date);
      const now = new Date();
      if (now > resetDate) {
        // Reset usage
        const userPlan = await this.getUserPlan(userId);
        const limits = this.getPlanLimits(userPlan);
        await supabase
          .from('ai_usage')
          .update({
            current_usage: 0,
            reset_date: this.getNextResetDate().toISOString(),
          })
          .eq('user_id', userId);
        return { allowed: true };
      }

      // Check current usage
      if (data.current_usage >= data.usage_limit) {
        return {
          allowed: false,
          message: `You've used ${data.current_usage} of ${data.usage_limit} AI requests this month. Upgrade to Pro or Max for more!`,
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('[AIService] Error in checkUsageLimit:', error);
      return { allowed: true }; // Allow on error
    }
  }

  /**
   * Get user's plan from profile
   */
  private static async getUserPlan(userId: string): Promise<'free' | 'pro' | 'max'> {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('is_pro')
        .eq('id', userId)
        .single();

      // For now, return free. In production, check subscription status
      return 'free';
    } catch (error) {
      return 'free';
    }
  }

  /**
   * Get plan limits
   */
  private static getPlanLimits(plan: 'free' | 'pro' | 'max'): number {
    const limits = {
      free: 50,
      pro: 500,
      max: 5000,
    };
    return limits[plan];
  }

  /**
   * Create usage record
   */
  private static async createUsageRecord(userId: string, plan: 'free' | 'pro' | 'max') {
    const usageLimit = this.getPlanLimits(plan);
    await supabase.from('ai_usage').insert({
      user_id: userId,
      plan,
      usage_limit: usageLimit,
      current_usage: 0,
      reset_date: this.getNextResetDate().toISOString(),
    });
  }

  /**
   * Increment usage counter
   */
  private static async incrementUsage(userId: string) {
    await supabase.rpc('increment_ai_usage', { user_id_param: userId });
  }

  /**
   * Get next reset date (first day of next month)
   */
  private static getNextResetDate(): Date {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth;
  }

  /**
   * Fallback local processing when Edge Function is unavailable
   * This is a basic implementation - production should use Edge Functions
   */
  private static processMessageLocally(
    message: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): AIResponse {
    const lowerMessage = message.toLowerCase();

    // Simple keyword-based task extraction
    const taskKeywords = ['create', 'add', 'make', 'new task', 'task'];
    const hasTaskIntent = taskKeywords.some(keyword => lowerMessage.includes(keyword));

    if (hasTaskIntent) {
      // Extract basic task information
      const titleMatch = message.match(/(?:task|create|add|make).*?['"]([^'"]+)['"]|(?:task|create|add|make)\s+(.+?)(?:\s+due|\s+priority|$)/i);
      const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : '';

      const dateMatch = message.match(/(?:due|by|on)\s+(\d{4}-\d{2}-\d{2}|\w+\s+\d{1,2})/i);
      const dueDate = dateMatch ? dateMatch[1] : undefined;

      const priorityMatch = message.match(/(high|medium|low)\s+priority/i);
      const priority: Priority = priorityMatch ? (priorityMatch[1] as Priority) : 'medium';

      if (title) {
        return {
          reply: `I'll help you create that task. Would you like me to add "${title}" to your task list?`,
          extractedTasks: [{
            title,
            dueDate,
            priority,
            category: 'personal',
          }],
          requiresConfirmation: true,
        };
      }
    }

    // Default response
    return {
      reply: "I'm here to help! You can ask me to create tasks, check what's due today, or help you stay organized. How can I assist you?",
    };
  }

  /**
   * Extract structured task data from natural language
   * This should be handled by the Edge Function in production
   */
  static extractTaskFromMessage(message: string): ExtractedTask | null {
    // This is a placeholder - actual extraction should happen in Edge Function
    // with proper NLP/AI model
    return null;
  }
}
