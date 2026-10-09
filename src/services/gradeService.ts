import { getSupabaseClient } from '../lib/supabase/client';
import { MockDatabaseStore } from '../lib/supabase/mockStore';
import { Grade, Profile } from '../types';

export const gradeService = {
  async getGrades(callerProfile: Profile | null): Promise<Grade[]> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        const { data, error } = await client
          .from('grades')
          .select('id, name, created_at')
          .order('name');

        if (!error && data) {
          return (data as Grade[]).map((g) => {
            const num = parseInt(g.name.replace(/\D/g, ''), 10);
            return {
              ...g,
              level: g.level || (num <= 5 ? 'Tiểu học' : 'THCS'),
            };
          }).sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
        }
      } catch (e) {
        console.warn('Supabase getGrades failed:', e);
      }
    }

    return MockDatabaseStore.getInstance().getGrades(callerProfile);
  },

  async createGrade(
    payload: { name: string; level?: string | null },
    callerProfile: Profile | null
  ): Promise<Grade> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        const { data, error } = await client
          .from('grades')
          .insert({ name: payload.name.trim() })
          .select('id, name, created_at')
          .single();

        if (!error && data) {
          return data as Grade;
        }
      } catch (e) {
        console.warn('Supabase createGrade fallback:', e);
      }
    }

    return MockDatabaseStore.getInstance().createGrade(payload, callerProfile);
  },

  async updateGrade(
    id: string,
    updates: { name?: string; level?: string | null },
    callerProfile: Profile | null
  ): Promise<Grade> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        const { data, error } = await client
          .from('grades')
          .update({
            ...(updates.name ? { name: updates.name.trim() } : {}),
          })
          .eq('id', id)
          .select('id, name, created_at')
          .single();

        if (!error && data) {
          return data as Grade;
        }
      } catch (e) {
        console.warn('Supabase updateGrade fallback:', e);
      }
    }

    return MockDatabaseStore.getInstance().updateGrade(id, updates, callerProfile);
  },

  async deleteGrade(id: string, callerProfile: Profile | null): Promise<void> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        const { error } = await client.from('grades').delete().eq('id', id);
        if (!error) return;
      } catch (e) {
        console.warn('Supabase deleteGrade fallback:', e);
      }
    }

    MockDatabaseStore.getInstance().deleteGrade(id, callerProfile);
  },
};
