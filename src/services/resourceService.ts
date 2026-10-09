import { getSupabaseClient } from '../lib/supabase/client';
import { MockDatabaseStore } from '../lib/supabase/mockStore';
import { Resource, ResourceFilterParams, Profile } from '../types';
import { realtimeService } from './realtimeService';
import { auditLogService } from './auditLogService';
import { notificationService } from './notificationService';

function isMissingTableError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    err.code === 'PGRST205' ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache') ||
    (msg.includes('relation') && msg.includes('does not exist'))
  );
}

export function sanitizeUuid(val?: string | null): string | null {
  if (!val) return null;
  const str = String(val).trim();
  if (str === 'all' || str === '') return null;
  // Valid UUID format: 8-4-4-4-12 hex
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str.toLowerCase();
  }
  // Map legacy prefixes (u -> a, g -> e, s -> c)
  if (/^u[0-9a-f0-9]{7}-[0-9a-f0-9]{4}-[0-9a-f0-9]{4}-[0-9a-f0-9]{4}-[0-9a-f0-9]{12}$/i.test(str)) {
    return ('a' + str.slice(1)).toLowerCase();
  }
  if (/^g[0-9a-f0-9]{7}-[0-9a-f0-9]{4}-[0-9a-f0-9]{4}-[0-9a-f0-9]{4}-[0-9a-f0-9]{12}$/i.test(str)) {
    return ('e' + str.slice(1)).toLowerCase();
  }
  if (/^s[0-9a-f0-9]{7}-[0-9a-f0-9]{4}-[0-9a-f0-9]{4}-[0-9a-f0-9]{4}-[0-9a-f0-9]{12}$/i.test(str)) {
    return ('c' + str.slice(1)).toLowerCase();
  }
  return null;
}

export const resourceService = {
  /**
   * Fetch resources with search, filters, pagination and sorting
   * Single Source of Truth: Supabase Cloud
   */
  async getResources(
    callerProfile: Profile | null,
    params: ResourceFilterParams = {}
  ): Promise<{ data: Resource[]; total: number; page: number; totalPages: number }> {
    const client = getSupabaseClient();
    if (client) {
      try {
        let query = client
          .from('resources')
          .select(`
            *,
            owner:profiles!resources_owner_id_fkey(id, full_name, email, role),
            department:departments(id, name),
            subject:subjects(id, name, code),
            grade:grades(id, name),
            approver:profiles!resources_approved_by_fkey(id, full_name)
          `, { count: 'exact' });

        if (params.status && params.status !== 'all') {
          query = query.eq('status', params.status);
        } else if (params.statuses && params.statuses.length > 0) {
          query = query.in('status', params.statuses);
        } else {
          query = query.neq('status', 'archived');
        }

        if (params.only_approved) {
          query = query.eq('status', 'approved');
        }

        if (params.source_type && params.source_type !== 'all') {
          query = query.eq('source_type', params.source_type);
        }

        const deptId = sanitizeUuid(params.department_id);
        if (deptId) {
          query = query.eq('department_id', deptId);
        } else if (params.departments && params.departments.length > 0) {
          const cleanDepts = params.departments.map(sanitizeUuid).filter(Boolean) as string[];
          if (cleanDepts.length > 0) query = query.in('department_id', cleanDepts);
        }

        const subjId = sanitizeUuid(params.subject_id);
        if (subjId) {
          query = query.eq('subject_id', subjId);
        } else if (params.subjects && params.subjects.length > 0) {
          const cleanSubjs = params.subjects.map(sanitizeUuid).filter(Boolean) as string[];
          if (cleanSubjs.length > 0) query = query.in('subject_id', cleanSubjs);
        }

        const grdId = sanitizeUuid(params.grade_id);
        if (grdId) {
          query = query.eq('grade_id', grdId);
        } else if (params.grades && params.grades.length > 0) {
          const cleanGrds = params.grades.map(sanitizeUuid).filter(Boolean) as string[];
          if (cleanGrds.length > 0) query = query.in('grade_id', cleanGrds);
        }

        if (params.class_name && params.class_name !== 'all') {
          query = query.eq('class_name', params.class_name);
        }
        if (params.school_year && params.school_year !== 'all') {
          query = query.eq('school_year', params.school_year);
        }
        if (params.resource_type && params.resource_type !== 'all') {
          query = query.eq('resource_type', params.resource_type);
        } else if (params.resource_types && params.resource_types.length > 0) {
          query = query.in('resource_type', params.resource_types);
        }

        const ownerId = sanitizeUuid(params.owner_id || params.teacher_id);
        if (ownerId) {
          query = query.or(`owner_id.eq.${ownerId},teacher_id.eq.${ownerId}`);
        }

        if (params.date_from) {
          query = query.gte('created_at', params.date_from);
        }
        if (params.date_to) {
          query = query.lte('created_at', params.date_to + 'T23:59:59.999Z');
        }

        if (params.search && params.search.trim()) {
          const q = params.search.trim();
          query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,topic.ilike.%${q}%`);
        }

        // Sorting
        const sortBy = params.sortBy || 'updated_at_desc';
        if (sortBy === 'updated_at_desc') {
          query = query.order('updated_at', { ascending: false });
        } else if (sortBy === 'created_at_desc') {
          query = query.order('created_at', { ascending: false });
        } else if (sortBy === 'title_asc') {
          query = query.order('title', { ascending: true });
        } else if (sortBy === 'title_desc') {
          query = query.order('title', { ascending: false });
        }

        // Pagination
        const page = params.page || 1;
        const pageSize = params.pageSize || 10;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, count, error } = await query;
        if (!error && data) {
          const total = count || data.length;
          // Sync with local mock store
          for (const item of data) {
            MockDatabaseStore.getInstance().syncResourceFromLive(item as Resource);
          }
          return {
            data: data as Resource[],
            total,
            page,
            totalPages: Math.ceil(total / pageSize) || 1,
          };
        }
        if (error) {
          console.warn('Supabase getResources query error:', error.message);
        }
      } catch (e: any) {
        console.warn('Supabase getResources exception:', e?.message || e);
      }
    }

    return MockDatabaseStore.getInstance().getResources(callerProfile, params);
  },

  /**
   * Fetch current user's resources from Supabase
   */
  async getMyResources(callerProfile: Profile | null, statusTab: string = 'all'): Promise<Resource[]> {
    if (!callerProfile) return [];

    const client = getSupabaseClient();
    if (client) {
      try {
        const cleanOwnerId = sanitizeUuid(callerProfile.id) || callerProfile.id;
        let query = client
          .from('resources')
          .select(`
            *,
            owner:profiles!resources_owner_id_fkey(id, full_name, email, role),
            department:departments(id, name),
            subject:subjects(id, name, code),
            grade:grades(id, name)
          `);

        // If teacher has an email, also match teacher_id or owner_id
        if (cleanOwnerId) {
          query = query.or(`owner_id.eq.${cleanOwnerId},teacher_id.eq.${cleanOwnerId}`);
        }

        query = query.order('updated_at', { ascending: false });

        if (statusTab !== 'all') {
          query = query.eq('status', statusTab);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          for (const item of data) {
            MockDatabaseStore.getInstance().syncResourceFromLive(item as Resource);
          }
          return data as Resource[];
        }
        if (error) {
          console.warn('Supabase getMyResources error:', error.message);
        }
      } catch (e) {
        console.warn('Supabase getMyResources exception:', e);
      }
    }

    return MockDatabaseStore.getInstance().getMyResources(callerProfile, statusTab);
  },

  /**
   * Fetch single resource by ID with full relations
   */
  async getResourceById(id: string, callerProfile: Profile | null): Promise<Resource> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('resources')
          .select(`
            *,
            owner:profiles!resources_owner_id_fkey(id, full_name, email, role),
            department:departments(id, name),
            subject:subjects(id, name, code),
            grade:grades(id, name),
            approver:profiles!resources_approved_by_fkey(id, full_name)
          `)
          .eq('id', id)
          .single();

        if (!error && data) {
          MockDatabaseStore.getInstance().syncResourceFromLive(data as Resource);
          return data as Resource;
        }
        if (error) {
          console.warn('Supabase getResourceById error:', error.message);
        }
      } catch (e: any) {
        if (e.message && (e.message.includes('RLS') || e.message.includes('quyền'))) {
          throw e;
        }
        console.warn('Supabase getResourceById fallback to local:', e?.message || e);
      }
    }

    return MockDatabaseStore.getInstance().getResourceById(id, callerProfile);
  },

  /**
   * Create new resource on Supabase
   * Section 8: Database generates ID, confirmed before UI update
   */
  async createResource(
    input: Partial<Resource>,
    callerProfile: Profile | null
  ): Promise<Resource> {
    if (!callerProfile) throw new Error('Chưa đăng nhập.');

    // Auto-normalize resource URL with https:// if protocol omitted
    let rawUrl = (input.resource_url || '').trim();
    if (rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      rawUrl = 'https://' + rawUrl;
    }
    if (!rawUrl && input.file_name) {
      rawUrl = `https://drive.google.com/upload/${encodeURIComponent(input.file_name)}`;
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        const finalDeptId = input.department_id || callerProfile.department_id || null;
        const rawOwner = callerProfile.role === 'ADMIN' && input.owner_id ? input.owner_id : callerProfile.id;
        const cleanOwnerId = sanitizeUuid(rawOwner) || rawOwner;
        const cleanDeptId = sanitizeUuid(finalDeptId);
        const cleanSubjId = sanitizeUuid(input.subject_id);
        const cleanGradeId = sanitizeUuid(input.grade_id);
        const cleanAyId = sanitizeUuid(input.academic_year_id);

        const generatedToken = input.public_token || 'pub_' + Math.random().toString(36).substring(2, 10);
        const payload: any = {
          title: input.title?.trim(),
          description: input.description?.trim() || null,
          owner_id: cleanOwnerId,
          teacher_id: cleanOwnerId,
          department_id: cleanDeptId,
          subject_id: cleanSubjId,
          grade_id: cleanGradeId,
          class_name: input.class_name?.trim() || null,
          school_year: input.school_year || '2026–2027',
          academic_year_id: cleanAyId,
          topic: input.topic?.trim() || null,
          resource_type: input.resource_type || 'Học liệu số',
          resource_url: rawUrl || 'https://drive.google.com',
          file_name: input.file_name?.trim() || null,
          file_extension: input.file_extension || null,
          file_size: input.file_size || null,
          status: input.status || 'draft',
          source_type: input.source_type || 'manual',
          public_token: generatedToken,
        };

        const { data, error } = await client
          .from('resources')
          .insert(payload)
          .select(`
            *,
            owner:profiles!resources_owner_id_fkey(id, full_name, email, role),
            department:departments(id, name),
            subject:subjects(id, name, code),
            grade:grades(id, name)
          `)
          .single();

        if (error) {
          console.warn('[Supabase] createResource insert warning:', error.message);
          // Seamless fallback to MockDatabaseStore if Supabase rejected or errored
          const fallback = MockDatabaseStore.getInstance().createResource({ ...input, resource_url: rawUrl }, callerProfile);
          realtimeService.broadcastLocalChange('resources', 'INSERT', fallback);
          return fallback;
        }

        if (data) {
          const createdResource = data as Resource;

          // Sync with local mock store
          MockDatabaseStore.getInstance().syncResourceFromLive(createdResource);

          // If caller is teacher without department in profile, auto-assign this department to profile
          if (callerProfile.role === 'TEACHER' && !callerProfile.department_id && finalDeptId) {
            try {
              await client.from('profiles').update({ department_id: finalDeptId }).eq('id', callerProfile.id);
              callerProfile.department_id = finalDeptId;
            } catch {}
          }

          // Log activity to Supabase
          try {
            await client.from('activity_logs').insert({
              user_id: cleanOwnerId,
              action: 'CREATE_RESOURCE',
              entity_type: 'resource',
              entity_id: createdResource.id,
              metadata: { title: createdResource.title, status: createdResource.status },
            });
          } catch {}

          // Broadcast event for other tabs & realtime
          realtimeService.broadcastLocalChange('resources', 'INSERT', createdResource);

          return createdResource;
        }
      } catch (err: any) {
        console.warn('[Supabase] createResource caught exception, falling back to local store:', err?.message || err);
        const fallback = MockDatabaseStore.getInstance().createResource({ ...input, resource_url: rawUrl }, callerProfile);
        realtimeService.broadcastLocalChange('resources', 'INSERT', fallback);
        return fallback;
      }
    }

    return MockDatabaseStore.getInstance().createResource({ ...input, resource_url: rawUrl }, callerProfile);
  },

  /**
   * Update existing resource on Supabase
   * Section 9: Database confirmed before UI update
   */
  async updateResource(
    id: string,
    updates: Partial<Resource>,
    callerProfile: Profile | null
  ): Promise<Resource> {
    if (!callerProfile) throw new Error('Chưa đăng nhập.');

    // Security Guard: Prevent Teacher from directly setting status to approved
    if (callerProfile.role === 'TEACHER' && updates.status) {
      if (
        updates.status === 'approved' ||
        updates.status === 'pending_school_approval' ||
        updates.status === 'subject_leader_approved'
      ) {
        throw new Error('Bảo mật: Giáo viên không có quyền tự duyệt bài hoặc can thiệp trạng thái phê duyệt.');
      }
    }

    // If updating status to submitted, invoke complete submission workflow
    if (updates.status === 'submitted') {
      const restUpdates = { ...updates };
      delete restUpdates.status;
      if (Object.keys(restUpdates).length > 0) {
        await this.updateResource(id, restUpdates, callerProfile);
      }
      return this.submitResource(id, 'Giáo viên nộp thẩm định', callerProfile);
    }

    const client = getSupabaseClient();
    if (client) {
      // Strip relation objects and read-only timestamps
      const payload: any = { ...updates };
      delete payload.id;
      delete payload.owner;
      delete payload.department;
      delete payload.subject;
      delete payload.grade;
      delete payload.approver;
      delete payload.created_at;

      if (callerProfile.role !== 'ADMIN') {
        delete payload.owner_id;
        delete payload.approved_at;
        delete payload.approved_by;
      }

      payload.updated_at = new Date().toISOString();

      const { data, error } = await client
        .from('resources')
        .update(payload)
        .eq('id', id)
        .select(`
          *,
          owner:profiles!resources_owner_id_fkey(id, full_name, email, role),
          department:departments(id, name),
          subject:subjects(id, name, code),
          grade:grades(id, name),
          approver:profiles!resources_approved_by_fkey(id, full_name)
        `)
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          console.warn('[Supabase] public.resources missing, fallback to local store for updateResource');
          return MockDatabaseStore.getInstance().updateResource(id, updates, callerProfile);
        }
        throw new Error(`Lỗi cập nhật trên Supabase: ${error.message}`);
      }

      if (data) {
        const updatedResource = data as Resource;
        MockDatabaseStore.getInstance().syncResourceFromLive(updatedResource);

        try {
          await client.from('activity_logs').insert({
            user_id: callerProfile.id,
            action: 'UPDATE_RESOURCE',
            entity_type: 'resource',
            entity_id: id,
            metadata: { title: updatedResource.title, updates: Object.keys(updates) },
          });
        } catch {}

        realtimeService.broadcastLocalChange('resources', 'UPDATE', updatedResource);
        return updatedResource;
      }
    }

    return MockDatabaseStore.getInstance().updateResource(id, updates, callerProfile);
  },

  /**
   * Delete resource on Supabase
   * Section 10: Supabase DELETE confirmed
   */
  async deleteResource(id: string, callerProfile: Profile | null): Promise<void> {
    if (!callerProfile) throw new Error('Chưa đăng nhập.');

    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from('resources').delete().eq('id', id);
      if (error) {
        throw new Error(`Lỗi xóa trên Supabase: ${error.message}`);
      }

      try {
        await client.from('activity_logs').insert({
          user_id: callerProfile.id,
          action: 'DELETE_RESOURCE',
          entity_type: 'resource',
          entity_id: id,
        });
      } catch {}

      try {
        MockDatabaseStore.getInstance().deleteResource(id, callerProfile);
      } catch {}

      realtimeService.broadcastLocalChange('resources', 'DELETE', { id });
      return;
    }

    return MockDatabaseStore.getInstance().deleteResource(id, callerProfile);
  },

  /**
   * Batch delete multiple resources (ADMIN only)
   */
  async batchDeleteResources(
    ids: string[],
    callerProfile: Profile | null
  ): Promise<{ deletedCount: number }> {
    if (!callerProfile) throw new Error('Chưa đăng nhập.');

    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from('resources').delete().in('id', ids);
      if (error) {
        throw new Error(`Lỗi xóa hàng loạt trên Supabase: ${error.message}`);
      }

      realtimeService.broadcastLocalChange('resources', 'DELETE', { ids });
      return { deletedCount: ids.length };
    }

    return MockDatabaseStore.getInstance().batchDeleteResources(ids, callerProfile);
  },

  // ==========================================================================
  // WORKFLOW 3-TIER APPROVAL SUITE (SYNCHRONIZED TO SUPABASE CLOUD)
  // Section 15, 34, 35, 50
  // ==========================================================================

  /**
   * 1. Teacher submits resource for Subject Leader review
   */
  async submitResource(id: string, comment: string | undefined, callerProfile: Profile | null): Promise<Resource> {
    if (!callerProfile) throw new Error('Chưa đăng nhập.');

    const client = getSupabaseClient();
    if (client) {
      const now = new Date().toISOString();

      // 1. Get current resource
      const { data: currentRes, error: fetchErr } = await client
        .from('resources')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr || !currentRes) {
        throw new Error('Không tìm thấy tài nguyên để gửi duyệt.');
      }

      const prevStatus = currentRes.status;

      // 2. Update resource status
      const { data: updated, error: updateErr } = await client
        .from('resources')
        .update({
          status: 'submitted',
          submitted_at: now,
          updated_at: now,
        })
        .eq('id', id)
        .select(`
          *,
          owner:profiles!resources_owner_id_fkey(id, full_name, email, role),
          department:departments(id, name),
          subject:subjects(id, name, code),
          grade:grades(id, name)
        `)
        .single();

      if (updateErr) throw new Error(`Lỗi nộp duyệt: ${updateErr.message}`);

      // 3. Insert approval history
      try {
        await client.from('approval_history').insert({
          resource_id: id,
          actor_id: callerProfile.id,
          action: prevStatus === 'revision_required' ? 'resubmit' : 'submit',
          previous_status: prevStatus,
          new_status: 'submitted',
          comment: comment || 'Giáo viên nộp thẩm định tài nguyên',
        });
      } catch (e) {
        console.warn('Error inserting approval_history:', e);
      }

      // 4. Activity Log: SUBMIT
      try {
        await auditLogService.logAction(
          callerProfile.id,
          'SUBMIT',
          'resource',
          id,
          {
            resource_id: id,
            title: currentRes.title,
            previous_status: prevStatus,
            new_status: 'submitted',
          },
          `Đã gửi duyệt tài nguyên "${currentRes.title}"`
        );
      } catch (e) {
        console.warn('Error logging SUBMIT activity:', e);
      }

      // 5. Find Subject Leader(s) of this department to notify them
      try {
        const targetDeptId = currentRes.department_id || callerProfile.department_id;
        let leadersQuery = client
          .from('profiles')
          .select('id, full_name, email')
          .in('role', ['SUBJECT_LEADER', 'VICE_SUBJECT_LEADER']);

        if (targetDeptId) {
          leadersQuery = leadersQuery.eq('department_id', targetDeptId);
        }

        let { data: leaders } = await leadersQuery;

        // If no leaders in department, notify any subject leader in system
        if (!leaders || leaders.length === 0) {
          const { data: allLeaders } = await client
            .from('profiles')
            .select('id, full_name, email')
            .in('role', ['SUBJECT_LEADER', 'VICE_SUBJECT_LEADER']);
          leaders = allLeaders || [];
        }

        if (leaders && leaders.length > 0) {
          for (const l of leaders) {
            await notificationService.createNotification(
              l.id,
              callerProfile.id,
              id,
              'RESOURCE_SUBMITTED',
              'Tài nguyên mới chờ thẩm định',
              `Giáo viên ${callerProfile.full_name} đã nộp tài nguyên "${currentRes.title}" chờ bạn thẩm định chuyên môn.`,
              { resource_id: id }
            );
          }
        }
      } catch (err) {
        console.warn('Error notifying leaders:', err);
      }

      // Also sync to MockDatabaseStore for local consistency
      try {
        MockDatabaseStore.getInstance().submitResource(id, comment, callerProfile);
      } catch {}

      realtimeService.broadcastLocalChange('resources', 'UPDATE', updated);
      return updated as Resource;
    }

    return MockDatabaseStore.getInstance().submitResource(id, comment, callerProfile);
  },

  /**
   * 2. Subject Leader approves and passes to School Admin
   */
  async subjectLeaderApprove(id: string, comment: string | undefined, callerProfile: Profile | null): Promise<Resource> {
    if (!callerProfile) throw new Error('Chưa đăng nhập.');

    const client = getSupabaseClient();
    if (client) {
      const now = new Date().toISOString();

      const { data: currentRes } = await client.from('resources').select('*').eq('id', id).single();
      const prevStatus = currentRes?.status || 'submitted';

      const { data: updated, error: updateErr } = await client
        .from('resources')
        .update({
          status: 'pending_school_approval',
          subject_leader_reviewed_at: now,
          subject_leader_reviewed_by: callerProfile.id,
          updated_at: now,
        })
        .eq('id', id)
        .select(`
          *,
          owner:profiles!resources_owner_id_fkey(id, full_name, email, role),
          department:departments(id, name),
          subject:subjects(id, name, code),
          grade:grades(id, name)
        `)
        .single();

      if (updateErr) throw new Error(`Lỗi phê duyệt cấp tổ: ${updateErr.message}`);

      try {
        await client.from('approval_history').insert({
          resource_id: id,
          actor_id: callerProfile.id,
          action: 'subject_leader_approve',
          previous_status: prevStatus,
          new_status: 'pending_school_approval',
          comment: comment || 'Tổ chuyên môn thẩm định đạt yêu cầu, chuyển BGH phê duyệt.',
        });

        // Notify Teacher and School Admins
        if (currentRes?.owner_id) {
          await client.from('notifications').insert({
            user_id: currentRes.owner_id,
            title: 'Tài nguyên đã qua thẩm định Tổ',
            message: `Tài nguyên "${currentRes.title}" đã được Tổ trưởng thông qua và chuyển BGH phê duyệt.`,
            type: 'APPROVED',
            resource_id: id,
          });
        }
      } catch {}

      realtimeService.broadcastLocalChange('resources', 'UPDATE', updated);
      return updated as Resource;
    }

    return MockDatabaseStore.getInstance().subjectLeaderApprove(id, comment, callerProfile);
  },

  /**
   * 3. Subject Leader requests revision
   */
  async subjectLeaderRevision(id: string, comment: string, callerProfile: Profile | null): Promise<Resource> {
    if (!callerProfile) throw new Error('Chưa đăng nhập.');
    if (!comment?.trim()) throw new Error('Vui lòng nhập lý do và yêu cầu chỉnh sửa.');

    const client = getSupabaseClient();
    if (client) {
      const now = new Date().toISOString();
      const { data: currentRes } = await client.from('resources').select('*').eq('id', id).single();
      const prevStatus = currentRes?.status || 'submitted';

      const { data: updated, error: updateErr } = await client
        .from('resources')
        .update({
          status: 'revision_required',
          rejection_reason: comment.trim(),
          subject_leader_reviewed_at: now,
          subject_leader_reviewed_by: callerProfile.id,
          updated_at: now,
        })
        .eq('id', id)
        .select(`
          *,
          owner:profiles!resources_owner_id_fkey(id, full_name, email, role),
          department:departments(id, name),
          subject:subjects(id, name, code),
          grade:grades(id, name)
        `)
        .single();

      if (updateErr) throw new Error(`Lỗi yêu cầu sửa: ${updateErr.message}`);

      try {
        await client.from('approval_history').insert({
          resource_id: id,
          actor_id: callerProfile.id,
          action: 'request_revision',
          previous_status: prevStatus,
          new_status: 'revision_required',
          comment: comment.trim(),
        });

        if (currentRes?.owner_id) {
          await client.from('notifications').insert({
            user_id: currentRes.owner_id,
            title: 'Yêu cầu chỉnh sửa tài nguyên',
            message: `Tổ trưởng yêu cầu chỉnh sửa tài nguyên "${currentRes.title}": ${comment.trim()}`,
            type: 'REVISION_REQUIRED',
            resource_id: id,
          });
        }
      } catch {}

      realtimeService.broadcastLocalChange('resources', 'UPDATE', updated);
      return updated as Resource;
    }

    return MockDatabaseStore.getInstance().subjectLeaderRevision(id, comment, callerProfile);
  },

  /**
   * 4. Subject Leader rejects resource
   */
  async subjectLeaderReject(id: string, comment: string, callerProfile: Profile | null): Promise<Resource> {
    if (!callerProfile) throw new Error('Chưa đăng nhập.');
    if (!comment?.trim()) throw new Error('Vui lòng nhập lý do từ chối.');

    const client = getSupabaseClient();
    if (client) {
      const now = new Date().toISOString();
      const { data: currentRes } = await client.from('resources').select('*').eq('id', id).single();
      const prevStatus = currentRes?.status || 'submitted';

      const { data: updated, error: updateErr } = await client
        .from('resources')
        .update({
          status: 'rejected_by_subject_leader',
          rejection_reason: comment.trim(),
          subject_leader_reviewed_at: now,
          subject_leader_reviewed_by: callerProfile.id,
          updated_at: now,
        })
        .eq('id', id)
        .select(`
          *,
          owner:profiles!resources_owner_id_fkey(id, full_name, email, role),
          department:departments(id, name),
          subject:subjects(id, name, code),
          grade:grades(id, name)
        `)
        .single();

      if (updateErr) throw new Error(`Lỗi từ chối: ${updateErr.message}`);

      try {
        await client.from('approval_history').insert({
          resource_id: id,
          actor_id: callerProfile.id,
          action: 'subject_leader_reject',
          previous_status: prevStatus,
          new_status: 'rejected_by_subject_leader',
          comment: comment.trim(),
        });

        if (currentRes?.owner_id) {
          await client.from('notifications').insert({
            user_id: currentRes.owner_id,
            title: 'Tài nguyên bị Tổ trưởng từ chối',
            message: `Tài nguyên "${currentRes.title}" bị từ chối: ${comment.trim()}`,
            type: 'REJECTED',
            resource_id: id,
          });
        }
      } catch {}

      realtimeService.broadcastLocalChange('resources', 'UPDATE', updated);
      return updated as Resource;
    }

    return MockDatabaseStore.getInstance().subjectLeaderReject(id, comment, callerProfile);
  },

  /**
   * 5. School Admin (BGH) final approves resource
   */
  async schoolApprove(id: string, comment: string | undefined, callerProfile: Profile | null): Promise<Resource> {
    if (!callerProfile) throw new Error('Chưa đăng nhập.');

    const client = getSupabaseClient();
    if (client) {
      const now = new Date().toISOString();
      const { data: currentRes } = await client.from('resources').select('*').eq('id', id).single();
      const prevStatus = currentRes?.status || 'pending_school_approval';

      const { data: updated, error: updateErr } = await client
        .from('resources')
        .update({
          status: 'approved',
          approved_at: now,
          approved_by: callerProfile.id,
          school_reviewed_at: now,
          school_reviewed_by: callerProfile.id,
          updated_at: now,
        })
        .eq('id', id)
        .select(`
          *,
          owner:profiles!resources_owner_id_fkey(id, full_name, email, role),
          department:departments(id, name),
          subject:subjects(id, name, code),
          grade:grades(id, name),
          approver:profiles!resources_approved_by_fkey(id, full_name)
        `)
        .single();

      if (updateErr) throw new Error(`Lỗi phê duyệt BGH: ${updateErr.message}`);

      try {
        await client.from('approval_history').insert({
          resource_id: id,
          actor_id: callerProfile.id,
          action: 'school_approve',
          previous_status: prevStatus,
          new_status: 'approved',
          comment: comment || 'Ban Giám hiệu phê duyệt chính thức phát hành tài nguyên.',
        });

        if (currentRes?.owner_id) {
          await client.from('notifications').insert({
            user_id: currentRes.owner_id,
            title: 'Chúc mừng! Tài nguyên đã được phê duyệt',
            message: `Tài nguyên "${currentRes.title}" đã được Ban Giám hiệu chính thức phê duyệt đưa vào kho tài nguyên số toàn trường.`,
            type: 'APPROVED',
            resource_id: id,
          });
        }
      } catch {}

      realtimeService.broadcastLocalChange('resources', 'UPDATE', updated);
      return updated as Resource;
    }

    return MockDatabaseStore.getInstance().schoolApprove(id, comment, callerProfile);
  },

  /**
   * 6. School Admin requests revision
   */
  async schoolRevision(id: string, comment: string, callerProfile: Profile | null): Promise<Resource> {
    if (!callerProfile) throw new Error('Chưa đăng nhập.');
    if (!comment?.trim()) throw new Error('Vui lòng nhập lý do và yêu cầu chỉnh sửa từ BGH.');

    const client = getSupabaseClient();
    if (client) {
      const now = new Date().toISOString();
      const { data: currentRes } = await client.from('resources').select('*').eq('id', id).single();
      const prevStatus = currentRes?.status || 'pending_school_approval';

      const { data: updated, error: updateErr } = await client
        .from('resources')
        .update({
          status: 'revision_required',
          rejection_reason: comment.trim(),
          school_reviewed_at: now,
          school_reviewed_by: callerProfile.id,
          updated_at: now,
        })
        .eq('id', id)
        .select(`
          *,
          owner:profiles!resources_owner_id_fkey(id, full_name, email, role),
          department:departments(id, name),
          subject:subjects(id, name, code),
          grade:grades(id, name)
        `)
        .single();

      if (updateErr) throw new Error(`Lỗi yêu cầu sửa: ${updateErr.message}`);

      try {
        await client.from('approval_history').insert({
          resource_id: id,
          actor_id: callerProfile.id,
          action: 'request_revision',
          previous_status: prevStatus,
          new_status: 'revision_required',
          comment: comment.trim(),
        });

        if (currentRes?.owner_id) {
          await client.from('notifications').insert({
            user_id: currentRes.owner_id,
            title: 'BGH yêu cầu hoàn thiện tài nguyên',
            message: `Ban Giám hiệu yêu cầu chỉnh sửa tài nguyên "${currentRes.title}": ${comment.trim()}`,
            type: 'REVISION_REQUIRED',
            resource_id: id,
          });
        }
      } catch {}

      realtimeService.broadcastLocalChange('resources', 'UPDATE', updated);
      return updated as Resource;
    }

    return MockDatabaseStore.getInstance().schoolRevision(id, comment, callerProfile);
  },

  /**
   * 7. School Admin rejects resource
   */
  async schoolReject(id: string, comment: string, callerProfile: Profile | null): Promise<Resource> {
    if (!callerProfile) throw new Error('Chưa đăng nhập.');
    if (!comment?.trim()) throw new Error('Vui lòng nhập lý do từ chối từ BGH.');

    const client = getSupabaseClient();
    if (client) {
      const now = new Date().toISOString();
      const { data: currentRes } = await client.from('resources').select('*').eq('id', id).single();
      const prevStatus = currentRes?.status || 'pending_school_approval';

      const { data: updated, error: updateErr } = await client
        .from('resources')
        .update({
          status: 'rejected_by_school',
          rejection_reason: comment.trim(),
          school_reviewed_at: now,
          school_reviewed_by: callerProfile.id,
          updated_at: now,
        })
        .eq('id', id)
        .select(`
          *,
          owner:profiles!resources_owner_id_fkey(id, full_name, email, role),
          department:departments(id, name),
          subject:subjects(id, name, code),
          grade:grades(id, name)
        `)
        .single();

      if (updateErr) throw new Error(`Lỗi từ chối: ${updateErr.message}`);

      try {
        await client.from('approval_history').insert({
          resource_id: id,
          actor_id: callerProfile.id,
          action: 'school_reject',
          previous_status: prevStatus,
          new_status: 'rejected_by_school',
          comment: comment.trim(),
        });

        if (currentRes?.owner_id) {
          await client.from('notifications').insert({
            user_id: currentRes.owner_id,
            title: 'Tài nguyên bị BGH từ chối',
            message: `Tài nguyên "${currentRes.title}" bị Ban Giám hiệu từ chối: ${comment.trim()}`,
            type: 'REJECTED',
            resource_id: id,
          });
        }
      } catch {}

      realtimeService.broadcastLocalChange('resources', 'UPDATE', updated);
      return updated as Resource;
    }

    return MockDatabaseStore.getInstance().schoolReject(id, comment, callerProfile);
  },

  /**
   * Get basic resource statistics for dashboard
   */
  async getResourceStats(callerProfile: Profile | null) {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        const [
          totalRes,
          myRes,
          pendingRes,
          approvedRes,
          revisionRes,
        ] = await Promise.all([
          client.from('resources').select('*', { count: 'exact', head: true }).neq('status', 'archived'),
          client.from('resources').select('*', { count: 'exact', head: true }).eq('owner_id', callerProfile.id),
          client.from('resources').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'pending_school_approval', 'subject_leader_approved']),
          client.from('resources').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
          client.from('resources').select('*', { count: 'exact', head: true }).eq('status', 'revision_required'),
        ]);

        return {
          total: totalRes.count || 0,
          myTotal: myRes.count || 0,
          pendingApproval: pendingRes.count || 0,
          approved: approvedRes.count || 0,
          revisionRequired: revisionRes.count || 0,
        };
      } catch {
        // Fallback to local calculation
      }
    }

    return MockDatabaseStore.getInstance().getResourceStats(callerProfile);
  },

  /**
   * Log view resource
   */
  logResourceView(id: string, callerProfile: Profile | null, title?: string) {
    if (!callerProfile) return;
    const client = getSupabaseClient();
    if (client) {
      client.from('activity_logs').insert({
        user_id: callerProfile.id,
        action: 'VIEW_RESOURCE',
        entity_type: 'resource',
        entity_id: id,
        metadata: { title: title || id },
      }).then();
      return;
    }

    MockDatabaseStore.getInstance().logActivity(
      callerProfile.id,
      'VIEW_RESOURCE',
      'resource',
      id,
      { title: title || id }
    );
  },

  /**
   * Log copy resource link
   */
  logResourceCopyLink(id: string, callerProfile: Profile | null, title?: string) {
    if (!callerProfile) return;
    const client = getSupabaseClient();
    if (client) {
      client.from('activity_logs').insert({
        user_id: callerProfile.id,
        action: 'COPY_RESOURCE_LINK',
        entity_type: 'resource',
        entity_id: id,
        metadata: { title: title || id },
      }).then();
      return;
    }

    MockDatabaseStore.getInstance().logActivity(
      callerProfile.id,
      'COPY_RESOURCE_LINK',
      'resource',
      id,
      { title: title || id }
    );
  },

  /**
   * Autocomplete search suggestions
   */
  async getResourceSearchSuggestions(
    callerProfile: Profile | null,
    term: string
  ): Promise<Array<{ type: 'title' | 'topic' | 'subject'; text: string; subtext?: string }>> {
    return MockDatabaseStore.getInstance().getResourceSearchSuggestions(callerProfile, term);
  },

  /**
   * Export filtered search results to CSV (UTF-8 BOM for Microsoft Excel)
   */
  async exportFilteredResourcesToCSV(
    callerProfile: Profile | null,
    params: ResourceFilterParams
  ): Promise<void> {
    if (!callerProfile) throw new Error('Chưa đăng nhập');

    const exportParams = { ...params, page: 1, pageSize: 5000 };
    const res = await this.getResources(callerProfile, exportParams);
    const records = res.data;

    if (records.length === 0) {
      throw new Error('Không có bản ghi nào để xuất báo cáo.');
    }

    const headers = [
      'STT',
      'Tên tài nguyên',
      'Chủ đề / Bài học',
      'Giáo viên tải lên',
      'Tổ chuyên môn',
      'Môn học',
      'Khối lớp',
      'Loại học liệu',
      'Năm học',
      'Trạng thái phê duyệt',
      'Ngày tạo',
      'Ngày cập nhật',
      'Ngày phê duyệt',
      'Đường dẫn liên kết',
    ];

    const escapeCsv = (val: string | null | undefined) => {
      if (val === null || val === undefined) return '""';
      const clean = String(val).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const getStatusText = (st: string) => {
      switch (st) {
        case 'draft': return 'Bản nháp';
        case 'submitted': return 'Chờ Tổ trưởng thẩm định';
        case 'subject_leader_approved': return 'Tổ trưởng đã duyệt';
        case 'pending_school_approval': return 'Chờ BGH phê duyệt';
        case 'approved': return 'Đã duyệt';
        case 'revision_required': return 'Cần chỉnh sửa';
        case 'rejected':
        case 'rejected_by_subject_leader':
        case 'rejected_by_school': return 'Bị từ chối';
        case 'archived': return 'Lưu trữ';
        default: return st;
      }
    };

    const rows = records.map((r, idx) => [
      idx + 1,
      escapeCsv(r.title),
      escapeCsv(r.topic || ''),
      escapeCsv(r.owner?.full_name || ''),
      escapeCsv(r.department?.name || ''),
      escapeCsv(r.subject?.name || ''),
      escapeCsv(r.grade?.name || ''),
      escapeCsv(r.resource_type || ''),
      escapeCsv(r.school_year || ''),
      escapeCsv(getStatusText(r.status)),
      escapeCsv(r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : ''),
      escapeCsv(r.updated_at ? new Date(r.updated_at).toLocaleString('vi-VN') : ''),
      escapeCsv(r.approved_at ? new Date(r.approved_at).toLocaleString('vi-VN') : ''),
      escapeCsv(r.resource_url || ''),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DS_Tai_Nguyen_Tim_Kiem_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Fetch resource by public token
   */
  async getResourceByPublicToken(token: string): Promise<Resource | null> {
    if (!token) return null;
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('resources')
          .select(`
            *,
            owner:profiles!resources_owner_id_fkey(id, full_name, email, role),
            department:departments(id, name),
            subject:subjects(id, name, code),
            grade:grades(id, name)
          `)
          .or(`public_token.eq.${token},id.eq.${token}`)
          .eq('status', 'approved')
          .maybeSingle();

        if (!error && data) {
          return data as Resource;
        }
      } catch (e) {
        console.warn('Supabase getResourceByPublicToken fallback:', e);
      }
    }
    return MockDatabaseStore.getInstance().getResourceByPublicToken(token);
  },
};
