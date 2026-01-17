import { supabase } from './supabase';
import { ChatMessage } from '@/types';

export interface ChatMessageRow {
  id: string;
  user_id: string;
  content: string;
  role: 'user' | 'assistant';
  task_id?: string;
  created_at: string;
}

/**
 * Chat service for persisting chat messages in Supabase
 */
export class ChatService {
  /**
   * Get all chat messages for the current user
   */
  static async getMessages(userId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[ChatService] Error fetching messages:', error);
        return [];
      }

      return (data || []).map(this.mapToChatMessage);
    } catch (error) {
      console.error('[ChatService] Error in getMessages:', error);
      return [];
    }
  }

  /**
   * Add a new chat message
   */
  static async addMessage(
    userId: string,
    content: string,
    role: 'user' | 'assistant',
    taskId?: string
  ): Promise<ChatMessage | null> {
    try {
      const messageRow = {
        user_id: userId,
        content,
        role,
        task_id: taskId || null,
      };

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messageRow)
        .select()
        .single();

      if (error) {
        console.error('[ChatService] Error adding message:', error);
        return null;
      }

      return this.mapToChatMessage(data);
    } catch (error) {
      console.error('[ChatService] Error in addMessage:', error);
      return null;
    }
  }

  /**
   * Delete all messages for a user (optional cleanup)
   */
  static async clearMessages(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('[ChatService] Error clearing messages:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[ChatService] Error in clearMessages:', error);
      return false;
    }
  }

  /**
   * Map database row to ChatMessage type
   */
  private static mapToChatMessage(row: ChatMessageRow): ChatMessage {
    return {
      id: row.id,
      content: row.content,
      role: row.role,
      timestamp: row.created_at,
    };
  }

  /**
   * Subscribe to real-time chat message updates
   */
  static subscribeToMessages(
    userId: string,
    callback: (message: ChatMessage) => void
  ) {
    const subscription = supabase
      .channel(`chat_messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newMessage = this.mapToChatMessage(payload.new as ChatMessageRow);
          callback(newMessage);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}
