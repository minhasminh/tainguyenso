import { getSupabaseClient } from '../lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

type RealtimeCallback = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  newRecord?: any;
  oldRecord?: any;
  table: string;
}) => void;

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscribers: Map<string, Set<RealtimeCallback>> = new Map();
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('school_resource_broadcast');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.table) {
            this.dispatchToLocalSubscribers(event.data.table, event.data);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel initialization error:', e);
      }
    }
  }

  /**
   * Broadcast an event to other tabs on the same machine
   */
  public broadcastLocalChange(table: string, eventType: 'INSERT' | 'UPDATE' | 'DELETE', record: any) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          table,
          eventType,
          newRecord: eventType !== 'DELETE' ? record : undefined,
          oldRecord: eventType === 'DELETE' ? record : undefined,
          timestamp: Date.now(),
        });
      } catch {
        // ignore
      }
    }
    // Also notify current tab subscribers
    this.dispatchToLocalSubscribers(table, {
      table,
      eventType,
      newRecord: eventType !== 'DELETE' ? record : undefined,
      oldRecord: eventType === 'DELETE' ? record : undefined,
    });
  }

  private dispatchToLocalSubscribers(table: string, payload: any) {
    const subs = this.subscribers.get(table);
    if (subs) {
      subs.forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`Error in realtime subscriber callback for table ${table}:`, err);
        }
      });
    }
  }

  /**
   * Universal subscription to table changes via Supabase Realtime
   */
  public subscribeToTable(table: string, callback: RealtimeCallback): () => void {
    if (!this.subscribers.has(table)) {
      this.subscribers.set(table, new Set());
    }
    this.subscribers.get(table)!.add(callback);

    // If channel doesn't exist yet, create one
    if (!this.channels.has(table)) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const channel = client
            .channel(`public:${table}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table },
              (payload: any) => {
                const standardizedPayload = {
                  eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                  newRecord: payload.new,
                  oldRecord: payload.old,
                  table,
                };
                this.dispatchToLocalSubscribers(table, standardizedPayload);
              }
            )
            .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                // successfully connected to postgres changes
              }
            });

          this.channels.set(table, channel);
        } catch (err) {
          console.warn(`Could not establish Supabase Realtime channel for table ${table}:`, err);
        }
      }
    }

    // Return cleanup unsubscribe function
    return () => {
      const subs = this.subscribers.get(table);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(table);
          const channel = this.channels.get(table);
          if (channel) {
            channel.unsubscribe().catch(() => {});
            this.channels.delete(table);
          }
        }
      }
    };
  }

  /**
   * Subscribe to resources table changes
   */
  public subscribeToResources(callback: (payload: { eventType: string; newRecord?: any; oldRecord?: any }) => void): () => void {
    return this.subscribeToTable('resources', (payload) => {
      callback(payload);
    });
  }

  /**
   * Subscribe to notifications table changes for current user
   */
  public subscribeToNotifications(
    userId: string,
    callback: (payload: { eventType: string; newRecord?: any }) => void
  ): () => void {
    const channelName = `notifications:user:${userId}`;

    if (!this.subscribers.has(channelName)) {
      this.subscribers.set(channelName, new Set());
    }
    this.subscribers.get(channelName)!.add(callback as any);

    if (!this.channels.has(channelName)) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const channel = client
            .channel(channelName)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`,
              },
              (payload: any) => {
                const formatted = {
                  eventType: payload.eventType,
                  newRecord: payload.new,
                  oldRecord: payload.old,
                  table: 'notifications',
                };
                const subs = this.subscribers.get(channelName);
                if (subs) {
                  subs.forEach((cb) => {
                    try {
                      cb(formatted);
                    } catch {}
                  });
                }
              }
            )
            .subscribe();

          this.channels.set(channelName, channel);
        } catch (e) {
          console.warn('Realtime notifications channel setup error:', e);
        }
      }
    }

    return () => {
      const subs = this.subscribers.get(channelName);
      if (subs) {
        subs.delete(callback as any);
        if (subs.size === 0) {
          this.subscribers.delete(channelName);
          const channel = this.channels.get(channelName);
          if (channel) {
            channel.unsubscribe().catch(() => {});
            this.channels.delete(channelName);
          }
        }
      }
    };
  }

  /**
   * Subscribe to approval history changes
   */
  public subscribeToApprovalHistory(callback: (payload: { eventType: string; newRecord?: any }) => void): () => void {
    return this.subscribeToTable('approval_history', (payload) => {
      callback(payload);
    });
  }
}

export const realtimeService = new RealtimeService();
