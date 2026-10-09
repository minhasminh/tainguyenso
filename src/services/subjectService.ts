import { getSupabaseClient, ensureSupabaseConfigLoaded } from '../lib/supabase/client';
import { MockDatabaseStore } from '../lib/supabase/mockStore';
import { Subject, Profile } from '../types';

export const subjectService = {
  async getSubjects(callerProfile?: Profile | null): Promise<Subject[]> {
    await ensureSupabaseConfigLoaded();
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('subjects')
          .select(`
            id,
            name,
            code,
            department_id,
            created_at,
            department:departments(id, name)
          `)
          .order('name');

        if (!error && data && data.length > 0) {
          return data as any;
        }
      } catch (e) {
        console.warn('Supabase getSubjects failed:', e);
      }
    }

    return MockDatabaseStore.getInstance().getSubjects(callerProfile || null);
  },

  async createSubject(
    payload: { name: string; code?: string | null; department_id?: string | null },
    callerProfile: Profile | null
  ): Promise<Subject> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        const { data, error } = await client
          .from('subjects')
          .insert({
            name: payload.name.trim(),
            code: payload.code ? payload.code.trim().toUpperCase() : null,
            department_id: payload.department_id || null,
          })
          .select(`
            id,
            name,
            code,
            department_id,
            created_at,
            department:departments(id, name)
          `)
          .single();

        if (!error && data) {
          return data as any;
        }
        if (error) {
          throw error;
        }
      } catch (e) {
        console.warn('Supabase createSubject fallback:', e);
      }
    }

    return MockDatabaseStore.getInstance().createSubject(payload, callerProfile);
  },

  async updateSubject(
    id: string,
    updates: { name?: string; code?: string | null; department_id?: string | null },
    callerProfile: Profile | null
  ): Promise<Subject> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        const { data, error } = await client
          .from('subjects')
          .update({
            ...(updates.name ? { name: updates.name.trim() } : {}),
            ...(updates.code !== undefined ? { code: updates.code ? updates.code.trim().toUpperCase() : null } : {}),
            ...(updates.department_id !== undefined ? { department_id: updates.department_id || null } : {}),
          })
          .eq('id', id)
          .select(`
            id,
            name,
            code,
            department_id,
            created_at,
            department:departments(id, name)
          `)
          .single();

        if (!error && data) {
          return data as any;
        }
        if (error) {
          throw error;
        }
      } catch (e) {
        console.warn('Supabase updateSubject fallback:', e);
      }
    }

    return MockDatabaseStore.getInstance().updateSubject(id, updates, callerProfile);
  },

  async deleteSubject(id: string, callerProfile: Profile | null): Promise<void> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        const { error } = await client
          .from('subjects')
          .delete()
          .eq('id', id);

        if (!error) {
          return;
        }
        if (error) {
          throw error;
        }
      } catch (e) {
        console.warn('Supabase deleteSubject fallback:', e);
      }
    }

    MockDatabaseStore.getInstance().deleteSubject(id, callerProfile);
  },
};
