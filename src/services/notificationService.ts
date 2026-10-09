import { getSupabaseClient } from '../lib/supabase/client';
import { MockDatabaseStore } from '../lib/supabase/mockStore';
import { AppNotification, NotificationType, Profile } from '../types';
import { realtimeService } from './realtimeService';

type NotificationListener = () => void;

class NotificationService {
  private listeners: Set<NotificationListener> = new Set();

  public subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public notifyChange() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error notifying notification listener:', err);
      }
    });
  }

  /**
   * Get notifications for current user with optional filters
   * Single Source of Truth: Supabase notifications table
   */
  async getNotifications(
    callerProfile: Profile | null,
    filter?: { is_read?: boolean; type?: NotificationType }
  ): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
    if (!callerProfile) {
      return { notifications: [], unreadCount: 0 };
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        let query = client
          .from('notifications')
          .select('*')
          .or(`recipient_id.eq.${callerProfile.id},user_id.eq.${callerProfile.id}`)
          .order('created_at', { ascending: false });

        if (filter?.is_read !== undefined) {
          query = query.eq('is_read', filter.is_read);
        }
        if (filter?.type) {
          query = query.eq('type', filter.type);
        }

        const { data, error } = await query;
        if (!error && data) {
          const list: AppNotification[] = data.map((item: any) => ({
            id: item.id,
            recipient_id: item.recipient_id || item.user_id || callerProfile.id,
            actor_id: item.actor_id || 'system',
            title: item.title,
            message: item.message,
            type: item.type,
            resource_id: item.resource_id,
            is_read: Boolean(item.is_read),
            read_at: item.read_at || null,
            created_at: item.created_at,
            metadata: item.metadata || null,
          }));

          const unreadCount = list.filter((n) => !n.is_read).length;
          return { notifications: list, unreadCount };
        }
      } catch (err) {
        console.warn('Supabase getNotifications fallback:', err);
      }
    }

    return MockDatabaseStore.getInstance().getNotifications(callerProfile, filter);
  }

  /**
   * Mark a single notification as read on Supabase
   */
  async markAsRead(id: string, callerProfile: Profile | null): Promise<void> {
    if (!callerProfile) throw new Error('Chưa đăng nhập.');

    // Always enforce RLS isolation locally first: throws if attempting to mark another user's notification
    MockDatabaseStore.getInstance().markNotificationAsRead(id, callerProfile);

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client
          .from('notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', id)
          .or(`recipient_id.eq.${callerProfile.id},user_id.eq.${callerProfile.id}`);

        if (error) {
          throw new Error(`RLS: ${error.message}`);
        }

        realtimeService.broadcastLocalChange('notifications', 'UPDATE', { id, is_read: true });
      } catch (err: any) {
        if (err.message?.includes('RLS') || err.message?.includes('chính mình')) {
          throw err;
        }
        console.warn('Supabase markAsRead error:', err);
      }
    }

    this.notifyChange();
  }

  /**
   * Mark all notifications of current user as read on Supabase
   */
  async markAllAsRead(callerProfile: Profile | null): Promise<void> {
    if (!callerProfile) throw new Error('Chưa đăng nhập.');

    MockDatabaseStore.getInstance().markAllNotificationsAsRead(callerProfile);

    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .or(`recipient_id.eq.${callerProfile.id},user_id.eq.${callerProfile.id}`);

        realtimeService.broadcastLocalChange('notifications', 'UPDATE', { all_read: true, user_id: callerProfile.id });
      } catch (err) {
        console.warn('Supabase markAllAsRead error:', err);
      }
    }

    this.notifyChange();
  }

  /**
   * Create notification in Supabase & local store
   */
  async createNotification(
    recipientId: string,
    actorId: string,
    resourceId: string | null,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    // 1. Create in local store for instantaneous UI reflection and test consistency
    MockDatabaseStore.getInstance().createNotification(
      recipientId,
      actorId,
      resourceId,
      type,
      title,
      message,
      metadata
    );

    // 2. Persist to Supabase Cloud
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('notifications').insert({
          recipient_id: recipientId,
          user_id: recipientId,
          actor_id: actorId,
          title,
          message,
          type,
          resource_id: resourceId,
          is_read: false,
          metadata: metadata || null,
        });
        realtimeService.broadcastLocalChange('notifications', 'INSERT', {
          recipient_id: recipientId,
          title,
          type,
        });
      } catch (e) {
        console.warn('Supabase createNotification error:', e);
      }
    }

    this.notifyChange();
  }
}

export const notificationService = new NotificationService();
