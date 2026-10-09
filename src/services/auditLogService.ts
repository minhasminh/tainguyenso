import { getSupabaseClient } from '../lib/supabase/client';
import { MockDatabaseStore } from '../lib/supabase/mockStore';
import { ActivityLog, ActivityAction, Profile } from '../types';
import { formatVietnamDateTime } from '../utils/formatters';

export const auditLogService = {
  /**
   * Fetch activity logs with RLS, filters & pagination directly from Supabase Cloud
   */
  async getActivityLogs(
    callerProfile: Profile | null,
    params: {
      actor_id?: string;
      action?: string;
      entity_type?: string;
      date_from?: string;
      date_to?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<{ data: ActivityLog[]; total: number; page: number; totalPages: number }> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        let query = client
          .from('activity_logs')
          .select(`
            *,
            actor:profiles!activity_logs_user_id_fkey(id, full_name, email, role)
          `, { count: 'exact' });

        if (params.actor_id && params.actor_id !== 'all') {
          query = query.eq('user_id', params.actor_id);
        }
        if (params.action && params.action !== 'all') {
          query = query.eq('action', params.action);
        }
        if (params.entity_type && params.entity_type !== 'all') {
          query = query.eq('entity_type', params.entity_type);
        }
        if (params.date_from) {
          query = query.gte('created_at', params.date_from);
        }
        if (params.date_to) {
          query = query.lte('created_at', params.date_to);
        }

        query = query.order('created_at', { ascending: false });

        const page = params.page || 1;
        const pageSize = params.pageSize || 20;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, count, error } = await query;
        if (!error && data) {
          const total = count || data.length;
          return {
            data: data as ActivityLog[],
            total,
            page,
            totalPages: Math.ceil(total / pageSize) || 1,
          };
        }
      } catch (err) {
        console.warn('Supabase getActivityLogs fallback:', err);
      }
    }

    return MockDatabaseStore.getInstance().getActivityLogs(callerProfile, params);
  },

  /**
   * Backward compatible getLogs method
   */
  async getLogs(callerProfile: Profile | null): Promise<ActivityLog[]> {
    const res = await this.getActivityLogs(callerProfile, { pageSize: 500 });
    return res.data;
  },

  /**
   * Section 30: Get unified resource history timeline
   */
  async getResourceHistory(
    resourceId: string,
    callerProfile: Profile | null
  ): Promise<any[]> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        const [approvalsRes, logsRes] = await Promise.all([
          client
            .from('approval_history')
            .select('*, actor:profiles!approval_history_actor_id_fkey(id, full_name, role)')
            .eq('resource_id', resourceId)
            .order('created_at', { ascending: false }),
          client
            .from('activity_logs')
            .select('*, actor:profiles!activity_logs_user_id_fkey(id, full_name, role)')
            .eq('entity_id', resourceId)
            .order('created_at', { ascending: false }),
        ]);

        const events: any[] = [];
        if (approvalsRes.data) {
          approvalsRes.data.forEach((a) => {
            events.push({
              type: 'APPROVAL',
              action: a.action,
              timestamp: a.created_at,
              actor: a.actor,
              comment: a.comment,
              new_status: a.new_status,
            });
          });
        }
        if (logsRes.data) {
          logsRes.data.forEach((l) => {
            events.push({
              type: 'ACTIVITY',
              action: l.action,
              timestamp: l.created_at,
              actor: l.actor,
              metadata: l.metadata,
              description: l.description,
            });
          });
        }

        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (events.length > 0) return events;
      } catch (err) {
        console.warn('Supabase getResourceHistory fallback:', err);
      }
    }

    return MockDatabaseStore.getInstance().getResourceHistory(resourceId, callerProfile);
  },

  /**
   * Log action with immutable recording on Supabase
   */
  async logAction(
    userId: string,
    action: ActivityAction,
    entityType: string,
    entityId: string | null = null,
    metadata: Record<string, any> = {},
    description?: string | null
  ): Promise<void> {
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('activity_logs').insert({
          user_id: userId,
          action,
          entity_type: entityType,
          entity_id: entityId,
          metadata,
          description,
        });
        return;
      } catch (e) {
        console.warn('Supabase logAction failed:', e);
      }
    }

    MockDatabaseStore.getInstance().logActivity(userId, action, entityType, entityId, metadata, description);
  },

  /**
   * Section 32: Export filtered activity logs to CSV
   */
  async exportLogsToCSV(
    callerProfile: Profile | null,
    params: {
      actor_id?: string;
      action?: string;
      entity_type?: string;
      date_from?: string;
      date_to?: string;
      search?: string;
    } = {}
  ): Promise<void> {
    const res = await this.getActivityLogs(callerProfile, {
      ...params,
      page: 1,
      pageSize: 5000,
    });

    const headers = [
      'STT',
      'Thời gian (VN)',
      'Người thực hiện',
      'Vai trò',
      'Email',
      'Hành động',
      'Thực thể',
      'Mã thực thể',
      'Mô tả chi tiết',
      'Dữ liệu mở rộng',
    ];

    const escapeCsv = (val: string | null | undefined) => {
      if (val === null || val === undefined) return '""';
      const clean = String(val).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = res.data.map((l, idx) => {
      const actor = l.actor || l.user;
      return [
        idx + 1,
        escapeCsv(formatVietnamDateTime(l.created_at)),
        escapeCsv(actor?.full_name || 'Hệ thống'),
        escapeCsv(actor?.role || 'SYSTEM'),
        escapeCsv(actor?.email || ''),
        escapeCsv(l.action),
        escapeCsv(l.entity_type),
        escapeCsv(l.entity_id || ''),
        escapeCsv(l.description || ''),
        escapeCsv(l.metadata ? JSON.stringify(l.metadata) : ''),
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Nhat_Ky_Hoat_Dong_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
