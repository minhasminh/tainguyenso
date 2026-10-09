import { getSupabaseClient } from '../lib/supabase/client';
import { MockDatabaseStore } from '../lib/supabase/mockStore';
import { GoogleDriveConfig, Profile } from '../types';

export const googleDriveConfigService = {
  async getConfig(callerProfile?: Profile | null): Promise<GoogleDriveConfig> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('system_settings')
          .select('value')
          .eq('key', 'google_drive_config')
          .single();

        if (!error && data?.value) {
          return data.value as GoogleDriveConfig;
        }
      } catch (err) {
        console.warn('Supabase getGoogleDriveConfig fallback:', err);
      }
    }

    return MockDatabaseStore.getInstance().getGoogleDriveConfig();
  },

  async updateConfig(
    updates: Partial<GoogleDriveConfig>,
    callerProfile: Profile | null
  ): Promise<GoogleDriveConfig> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        const { data, error } = await client
          .from('system_settings')
          .upsert({
            key: 'google_drive_config',
            value: updates,
            updated_at: new Date().toISOString(),
            updated_by: callerProfile.id,
          })
          .select('value')
          .single();

        if (!error && data?.value) {
          return data.value as GoogleDriveConfig;
        }
      } catch (err) {
        console.warn('Supabase updateGoogleDriveConfig fallback:', err);
      }
    }

    return MockDatabaseStore.getInstance().updateGoogleDriveConfig(updates, callerProfile);
  },
};
