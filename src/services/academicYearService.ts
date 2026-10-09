import { getSupabaseClient } from '../lib/supabase/client';
import { MockDatabaseStore } from '../lib/supabase/mockStore';
import { AcademicYear, Profile } from '../types';

export const academicYearService = {
  async getAcademicYears(callerProfile?: Profile | null): Promise<AcademicYear[]> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        const { data, error } = await client
          .from('academic_years')
          .select('*')
          .order('start_date', { ascending: false });

        if (!error && data) {
          return data as AcademicYear[];
        }
      } catch (e) {
        console.warn('Supabase getAcademicYears failed, using local store:', e);
      }
    }

    return MockDatabaseStore.getInstance().getAcademicYears();
  },

  async createAcademicYear(
    payload: { name: string; start_date?: string; end_date?: string; is_active?: boolean },
    callerProfile: Profile | null
  ): Promise<AcademicYear> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        // If active, unset other active years first
        if (payload.is_active) {
          await client.from('academic_years').update({ is_active: false }).neq('id', 'dummy');
        }

        const { data, error } = await client
          .from('academic_years')
          .insert({
            name: payload.name.trim(),
            start_date: payload.start_date,
            end_date: payload.end_date,
            is_active: Boolean(payload.is_active),
          })
          .select('*')
          .single();

        if (!error && data) {
          return data as AcademicYear;
        }
      } catch (e) {
        console.warn('Supabase createAcademicYear fallback:', e);
      }
    }

    return MockDatabaseStore.getInstance().createAcademicYear(payload, callerProfile);
  },

  async updateAcademicYear(
    id: string,
    updates: { name?: string; start_date?: string; end_date?: string; is_active?: boolean },
    callerProfile: Profile | null
  ): Promise<AcademicYear> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        if (updates.is_active) {
          await client.from('academic_years').update({ is_active: false }).neq('id', id);
        }

        const { data, error } = await client
          .from('academic_years')
          .update(updates)
          .eq('id', id)
          .select('*')
          .single();

        if (!error && data) {
          return data as AcademicYear;
        }
      } catch (e) {
        console.warn('Supabase updateAcademicYear fallback:', e);
      }
    }

    return MockDatabaseStore.getInstance().updateAcademicYear(id, updates, callerProfile);
  },

  async deleteAcademicYear(id: string, callerProfile: Profile | null): Promise<void> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        const { error } = await client.from('academic_years').delete().eq('id', id);
        if (!error) return;
      } catch (e) {
        console.warn('Supabase deleteAcademicYear fallback:', e);
      }
    }

    MockDatabaseStore.getInstance().deleteAcademicYear(id, callerProfile);
  },

  async setActiveAcademicYear(id: string, callerProfile: Profile | null): Promise<AcademicYear> {
    return this.updateAcademicYear(id, { is_active: true }, callerProfile);
  },
};

