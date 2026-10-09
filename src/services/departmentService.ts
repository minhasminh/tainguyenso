import { getSupabaseClient, ensureSupabaseConfigLoaded } from '../lib/supabase/client';
import { MockDatabaseStore } from '../lib/supabase/mockStore';
import { Department, Profile } from '../types';

export const departmentService = {
  async getDepartments(callerProfile?: Profile | null): Promise<Department[]> {
    await ensureSupabaseConfigLoaded();
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('departments')
          .select(`
            id,
            name,
            description,
            leader_id,
            created_at,
            updated_at,
            leader:profiles!fk_departments_leader(id, full_name, email)
          `)
          .order('name');

        if (!error && data && data.length > 0) {
          return data as any;
        }
      } catch (e) {
        console.warn('Supabase getDepartments failed:', e);
      }
    }

    return MockDatabaseStore.getInstance().getDepartments(callerProfile || null);
  },

  async createDepartment(
    payload: { name: string; description?: string | null; leader_id?: string | null },
    callerProfile: Profile | null
  ): Promise<Department> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        const { data, error } = await client
          .from('departments')
          .insert({
            name: payload.name.trim(),
            description: payload.description ? payload.description.trim() : null,
            leader_id: payload.leader_id || null,
          })
          .select(`
            id,
            name,
            description,
            leader_id,
            created_at,
            updated_at,
            leader:profiles!fk_departments_leader(id, full_name, email)
          `)
          .single();

        if (!error && data) {
          return data as any;
        }
        if (error) {
          if (error.code === '23505') {
            throw new Error(`Tổ chuyên môn "${payload.name.trim()}" đã tồn tại trong hệ thống.`);
          }
          throw error;
        }
      } catch (e: any) {
        if (e?.message && e.message.includes('đã tồn tại trong hệ thống')) {
          throw e;
        }
        console.warn('Supabase createDepartment fallback:', e);
      }
    }

    return MockDatabaseStore.getInstance().createDepartment(payload, callerProfile);
  },

  async updateDepartment(
    id: string,
    updates: { name?: string; description?: string | null; leader_id?: string | null },
    callerProfile: Profile | null
  ): Promise<Department> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        const { data, error } = await client
          .from('departments')
          .update({
            ...(updates.name ? { name: updates.name.trim() } : {}),
            ...(updates.description !== undefined ? { description: updates.description ? updates.description.trim() : null } : {}),
            ...(updates.leader_id !== undefined ? { leader_id: updates.leader_id || null } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select(`
            id,
            name,
            description,
            leader_id,
            created_at,
            updated_at,
            leader:profiles!fk_departments_leader(id, full_name, email)
          `)
          .single();

        if (!error && data) {
          return data as any;
        }
        if (error) {
          if (error.code === '23505') {
            throw new Error(`Tổ chuyên môn "${updates.name?.trim() || ''}" đã tồn tại trong hệ thống.`);
          }
          throw error;
        }
      } catch (e: any) {
        if (e?.message && e.message.includes('đã tồn tại trong hệ thống')) {
          throw e;
        }
        console.warn('Supabase updateDepartment fallback:', e);
      }
    }

    return MockDatabaseStore.getInstance().updateDepartment(id, updates, callerProfile);
  },

  async deleteDepartment(id: string, callerProfile: Profile | null): Promise<void> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        const { error } = await client
          .from('departments')
          .delete()
          .eq('id', id);

        if (!error) {
          return;
        }
        if (error) {
          throw error;
        }
      } catch (e) {
        console.warn('Supabase deleteDepartment fallback:', e);
      }
    }

    MockDatabaseStore.getInstance().deleteDepartment(id, callerProfile);
  },
};
