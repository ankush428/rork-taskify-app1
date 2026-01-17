import { supabase } from './supabase';
import { User, Friend } from '@/types';

export interface FriendRelationship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked' | 'declined';
  created_at: string;
  updated_at: string;
}

export interface FriendWithUser extends FriendRelationship {
  user: User;
  isRequester: boolean;
}

/**
 * Friend Service for managing friend relationships and invitations
 */
export class FriendService {
  /**
   * Get all friends (accepted relationships)
   */
  static async getFriends(userId: string): Promise<Friend[]> {
    try {
      // Get relationships where user is requester or addressee and status is accepted
      const { data, error } = await supabase
        .from('friend_relationships')
        .select(`
          id,
          requester_id,
          addressee_id,
          status,
          created_at
        `)
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (error) {
        console.error('[FriendService] Error fetching friends:', error);
        return [];
      }

      // Get friend user details and shared task counts
      const friends: Friend[] = await Promise.all(
        (data || []).map(async (rel) => {
          const friendId = rel.requester_id === userId ? rel.addressee_id : rel.requester_id;
          const friendUser = await this.getUserById(friendId);
          const sharedTasksCount = await this.getSharedTasksCount(userId, friendId);

          return {
            id: rel.id,
            user: friendUser || {
              id: friendId,
              name: 'Unknown User',
              email: '',
              createdAt: rel.created_at,
            },
            status: rel.status as 'pending' | 'accepted' | 'blocked',
            sharedTasks: sharedTasksCount,
          };
        })
      );

      return friends;
    } catch (error) {
      console.error('[FriendService] Error in getFriends:', error);
      return [];
    }
  }

  /**
   * Get pending friend requests (both sent and received)
   */
  static async getPendingRequests(userId: string): Promise<FriendWithUser[]> {
    try {
      const { data, error } = await supabase
        .from('friend_relationships')
        .select('*')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq('status', 'pending');

      if (error) {
        console.error('[FriendService] Error fetching pending requests:', error);
        return [];
      }

      const requests: FriendWithUser[] = await Promise.all(
        (data || []).map(async (rel) => {
          const friendId = rel.requester_id === userId ? rel.addressee_id : rel.requester_id;
          const friendUser = await this.getUserById(friendId);

          return {
            ...rel,
            user: friendUser || {
              id: friendId,
              name: 'Unknown User',
              email: '',
              createdAt: rel.created_at,
            },
            isRequester: rel.requester_id === userId,
          };
        })
      );

      return requests;
    } catch (error) {
      console.error('[FriendService] Error in getPendingRequests:', error);
      return [];
    }
  }

  /**
   * Send friend request by email
   */
  static async sendFriendRequest(userId: string, email: string): Promise<boolean> {
    try {
      // Find user by email
      const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (userError || !users) {
        console.error('[FriendService] User not found:', email);
        return false;
      }

      const friendId = users.id;

      if (friendId === userId) {
        console.error('[FriendService] Cannot add yourself as friend');
        return false;
      }

      // Check if relationship already exists
      const { data: existing } = await supabase
        .from('friend_relationships')
        .select('*')
        .or(`and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`)
        .single();

      if (existing) {
        console.error('[FriendService] Relationship already exists');
        return false;
      }

      // Create friend request
      const { error } = await supabase
        .from('friend_relationships')
        .insert({
          requester_id: userId,
          addressee_id: friendId,
          status: 'pending',
        });

      if (error) {
        console.error('[FriendService] Error sending friend request:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[FriendService] Error in sendFriendRequest:', error);
      return false;
    }
  }

  /**
   * Accept friend request
   */
  static async acceptFriendRequest(userId: string, requestId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('friend_relationships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('addressee_id', userId)
        .eq('status', 'pending');

      if (error) {
        console.error('[FriendService] Error accepting friend request:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[FriendService] Error in acceptFriendRequest:', error);
      return false;
    }
  }

  /**
   * Decline friend request
   */
  static async declineFriendRequest(userId: string, requestId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('friend_relationships')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('addressee_id', userId)
        .eq('status', 'pending');

      if (error) {
        console.error('[FriendService] Error declining friend request:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[FriendService] Error in declineFriendRequest:', error);
      return false;
    }
  }

  /**
   * Remove friend (unfriend)
   */
  static async removeFriend(userId: string, friendId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('friend_relationships')
        .delete()
        .or(`and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`)
        .eq('status', 'accepted');

      if (error) {
        console.error('[FriendService] Error removing friend:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[FriendService] Error in removeFriend:', error);
      return false;
    }
  }

  /**
   * Generate invite link (simple implementation)
   */
  static generateInviteLink(userId: string, userName: string): string {
    // In production, this would be a deep link like: taskify://invite?code=...
    // For now, return a shareable text format
    return `Join me on Taskify! Use my invite code: ${userId.substring(0, 8)}`;
  }

  /**
   * Get user by ID
   */
  private static async getUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        name: data.name,
        email: data.email,
        avatar: data.avatar,
        isPro: data.is_pro,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('[FriendService] Error getting user:', error);
      return null;
    }
  }

  /**
   * Get count of shared tasks between two users
   */
  private static async getSharedTasksCount(userId1: string, userId2: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('task_shares')
        .select('*', { count: 'exact', head: true })
        .or(`and(shared_by_id.eq.${userId1},shared_with_id.eq.${userId2}),and(shared_by_id.eq.${userId2},shared_with_id.eq.${userId1})`);

      if (error) {
        console.error('[FriendService] Error counting shared tasks:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Subscribe to friend relationship changes
   */
  static subscribeToFriends(
    userId: string,
    callbacks: {
      onInsert?: (relationship: FriendRelationship) => void;
      onUpdate?: (relationship: FriendRelationship) => void;
      onDelete?: (relationshipId: string) => void;
    }
  ) {
    const subscription = supabase
      .channel(`friends:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_relationships',
          filter: `requester_id=eq.${userId},addressee_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            callbacks.onInsert?.(payload.new as FriendRelationship);
          } else if (payload.eventType === 'UPDATE') {
            callbacks.onUpdate?.(payload.new as FriendRelationship);
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
