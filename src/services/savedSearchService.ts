import { getSupabaseClient } from '../lib/supabase/client';
import { MockDatabaseStore } from '../lib/supabase/mockStore';
import { SavedSearch, Profile, ResourceFilterParams } from '../types';

export const savedSearchService = {
  /**
   * Get all saved searches for the current authenticated user (RLS: own only)
   */
  async getSavedSearches(callerProfile: Profile | null): Promise<SavedSearch[]> {
    if (!callerProfile) return [];

    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('saved_searches')
          .select('*')
          .eq('user_id', callerProfile.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data as SavedSearch[];
        }
      } catch (e) {
        console.warn('Supabase getSavedSearches failed, falling back to local store:', e);
      }
    }

    return MockDatabaseStore.getInstance().getSavedSearches(callerProfile);
  },

  /**
   * Create a new saved search filter for current user
   */
  async createSavedSearch(
    callerProfile: Profile | null,
    name: string,
    filters: ResourceFilterParams
  ): Promise<SavedSearch> {
    if (!callerProfile) throw new Error('Chưa đăng nhập');
    if (!name.trim()) throw new Error('Vui lòng nhập tên cho bộ lọc');

    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('saved_searches')
          .insert({
            user_id: callerProfile.id,
            name: name.trim(),
            filters_json: filters,
          })
          .select()
          .single();

        if (!error && data) {
          return data as SavedSearch;
        }
      } catch (e) {
        console.warn('Supabase createSavedSearch failed, falling back to local store:', e);
      }
    }

    return MockDatabaseStore.getInstance().createSavedSearch(callerProfile, name.trim(), filters);
  },

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(callerProfile: Profile | null, id: string): Promise<void> {
    if (!callerProfile) throw new Error('Chưa đăng nhập');

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client
          .from('saved_searches')
          .delete()
          .eq('id', id)
          .eq('user_id', callerProfile.id);

        if (!error) return;
      } catch (e) {
        console.warn('Supabase deleteSavedSearch failed, falling back to local store:', e);
      }
    }

    MockDatabaseStore.getInstance().deleteSavedSearch(callerProfile, id);
  },
};
