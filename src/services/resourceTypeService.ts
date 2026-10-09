import { getSupabaseClient } from '../lib/supabase/client';
import { MockDatabaseStore } from '../lib/supabase/mockStore';
import { ResourceType, Profile } from '../types';

export const resourceTypeService = {
  async getResourceTypes(
    callerProfile: Profile | null,
    includeInactive = false
  ): Promise<ResourceType[]> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        let query = client.from('resource_types').select('*').order('name');
        if (!includeInactive) {
          query = query.eq('is_active', true);
        }
        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          return data as ResourceType[];
        }
      } catch (e) {
        console.warn('Supabase getResourceTypes failed:', e);
      }
    }

    return MockDatabaseStore.getInstance().getResourceTypes(callerProfile, includeInactive);
  },

  async createResourceType(
    payload: { name: string; code?: string | null; description?: string | null; is_active?: boolean },
    callerProfile: Profile | null
  ): Promise<ResourceType> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        const { data, error } = await client
          .from('resource_types')
          .insert({
            name: payload.name.trim(),
            code: payload.code ? payload.code.trim().toUpperCase() : null,
            description: payload.description ? payload.description.trim() : null,
            is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
          })
          .select('*')
          .single();

        if (!error && data) {
          return data as ResourceType;
        }
      } catch (e) {
        console.warn('Supabase createResourceType fallback:', e);
      }
    }

    return MockDatabaseStore.getInstance().createResourceType(payload, callerProfile);
  },

  async updateResourceType(
    id: string,
    updates: { name?: string; code?: string | null; description?: string | null; is_active?: boolean },
    callerProfile: Profile | null
  ): Promise<ResourceType> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        const { data, error } = await client
          .from('resource_types')
          .update(updates)
          .eq('id', id)
          .select('*')
          .single();

        if (!error && data) {
          return data as ResourceType;
        }
      } catch (e) {
        console.warn('Supabase updateResourceType fallback:', e);
      }
    }

    return MockDatabaseStore.getInstance().updateResourceType(id, updates, callerProfile);
  },

  async deleteResourceType(id: string, callerProfile: Profile | null): Promise<void> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        const { error } = await client.from('resource_types').delete().eq('id', id);
        if (!error) return;
      } catch (e) {
        console.warn('Supabase deleteResourceType fallback:', e);
      }
    }

    MockDatabaseStore.getInstance().deleteResourceType(id, callerProfile);
  },

  async toggleResourceTypeActive(id: string, callerProfile: Profile | null): Promise<ResourceType> {
    return MockDatabaseStore.getInstance().toggleResourceTypeActive(id, callerProfile);
  },
};

