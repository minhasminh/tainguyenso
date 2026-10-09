import { getSupabaseClient, ensureSupabaseConfigLoaded } from '../lib/supabase/client';
import { MockDatabaseStore } from '../lib/supabase/mockStore';
import { realtimeService } from './realtimeService';
import { Profile, UserRole, UserStatus } from '../types';

const VALID_DEPT_IDS = new Set([
  'd1111111-1111-1111-1111-111111111111',
  'd2222222-2222-2222-2222-222222222222',
  'd3333333-3333-3333-3333-333333333333',
  'd4444444-4444-4444-4444-444444444444',
  'd5555555-5555-5555-5555-555555555555',
]);

const VALID_SUBJ_IDS = new Set([
  'c1111111-1111-1111-1111-111111111111',
  'c2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333',
  'c4444444-4444-4444-4444-444444444444',
  'c5555555-5555-5555-5555-555555555555',
  'c6666666-6666-6666-6666-666666666666',
  'c7777777-7777-7777-7777-777777777777',
  'c8888888-8888-8888-8888-888888888888',
  'c9999999-9999-9999-9999-999999999999',
  'caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
]);

function sanitizeDepartmentId(id?: string | null): string | null {
  if (!id) return null;
  const trimmed = id.trim();
  if (VALID_DEPT_IDS.has(trimmed)) return trimmed;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return VALID_DEPT_IDS.has(trimmed.toLowerCase()) ? trimmed.toLowerCase() : null;
  }
  return null;
}

function sanitizeSubjectId(id?: string | null): string | null {
  if (!id) return null;
  let trimmed = id.trim();
  // Map s... to c... if from old mock format
  if (/^s([0-9a-f0-9]{7}-[0-9a-f0-9]{4}-[0-9a-f0-9]{4}-[0-9a-f0-9]{4}-[0-9a-f0-9]{12})$/i.test(trimmed)) {
    trimmed = 'c' + trimmed.slice(1);
  }
  if (VALID_SUBJ_IDS.has(trimmed.toLowerCase())) {
    return trimmed.toLowerCase();
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return VALID_SUBJ_IDS.has(trimmed.toLowerCase()) ? trimmed.toLowerCase() : null;
  }
  return null;
}

const isValidUUID = (str?: string | null): boolean =>
  Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

export const userService = {
  async getProfiles(callerProfile?: Profile | null): Promise<Profile[]> {
    await ensureSupabaseConfigLoaded();
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('profiles')
          .select(`
            id,
            full_name,
            email,
            avatar_url,
            department_id,
            subject_id,
            role,
            status,
            password,
            created_at,
            updated_at,
            department:departments!profiles_department_id_fkey(id, name, description),
            subject:subjects!profiles_subject_id_fkey(id, name, code)
          `)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          MockDatabaseStore.getInstance().syncAllProfilesFromLive(data as any);
          return data as any;
        }
        if (error) {
          console.warn('[Supabase] getProfiles error:', error.message);
        }
      } catch (err: any) {
        console.warn('Supabase query failed, falling back to /api/users:', err);
      }
    }

    // Attempt server proxy API
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          MockDatabaseStore.getInstance().syncAllProfilesFromLive(json.data);
          return json.data;
        }
      }
    } catch (e) {
      console.warn('Fetch /api/users failed:', e);
    }

    return MockDatabaseStore.getInstance().getProfiles(callerProfile || null);
  },

  async getProfileById(id: string, callerProfile: Profile | null): Promise<Profile | null> {
    await ensureSupabaseConfigLoaded();
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('profiles')
          .select(`
            id,
            full_name,
            email,
            avatar_url,
            department_id,
            subject_id,
            role,
            status,
            password,
            created_at,
            updated_at,
            department:departments!profiles_department_id_fkey(id, name, description),
            subject:subjects!profiles_subject_id_fkey(id, name, code)
          `)
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          MockDatabaseStore.getInstance().syncProfileFromLive(data as any);
          return data as any;
        }
      } catch (err: any) {
        console.warn('Supabase query failed for single profile:', err);
      }
    }

    return MockDatabaseStore.getInstance().getProfileById(id, callerProfile);
  },

  async updateProfile(
    targetUserId: string,
    updates: Partial<Profile>,
    callerProfile: Profile | null
  ): Promise<Profile> {
    await ensureSupabaseConfigLoaded();
    const updatePayload: Record<string, any> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    delete updatePayload.department;
    delete updatePayload.subject;

    if (updatePayload.department_id !== undefined) {
      updatePayload.department_id = sanitizeDepartmentId(updatePayload.department_id);
    }
    if (updatePayload.subject_id !== undefined) {
      updatePayload.subject_id = sanitizeSubjectId(updatePayload.subject_id);
    }

    let updatedProfile: Profile | null = null;
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('profiles')
          .update(updatePayload)
          .eq('id', targetUserId)
          .select(`
            id,
            full_name,
            email,
            avatar_url,
            department_id,
            subject_id,
            role,
            status,
            password,
            created_at,
            updated_at,
            department:departments!profiles_department_id_fkey(id, name, description),
            subject:subjects!profiles_subject_id_fkey(id, name, code)
          `)
          .single();

        if (!error && data) {
          updatedProfile = data as any;
        }
      } catch (err: any) {
        console.warn('[Supabase] updateProfile error, trying /api/users:', err);
      }
    }

    if (!updatedProfile) {
      try {
        const res = await fetch(`/api/users/${targetUserId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            updatedProfile = json.data;
          }
        }
      } catch (e) {
        console.warn('PUT /api/users failed:', e);
      }
    }

    if (updatedProfile) {
      MockDatabaseStore.getInstance().syncProfileFromLive(updatedProfile);
      realtimeService.broadcastLocalChange('profiles', 'UPDATE', updatedProfile);
      return updatedProfile;
    }

    const localUpdated = MockDatabaseStore.getInstance().updateProfile(targetUserId, updates, callerProfile);
    realtimeService.broadcastLocalChange('profiles', 'UPDATE', localUpdated);
    return localUpdated;
  },

  async updateStatus(
    targetUserId: string,
    status: UserStatus,
    callerProfile: Profile | null
  ): Promise<Profile> {
    return this.updateProfile(targetUserId, { status }, callerProfile);
  },

  async updateRole(
    targetUserId: string,
    role: UserRole,
    callerProfile: Profile | null
  ): Promise<Profile> {
    return this.updateProfile(targetUserId, { role }, callerProfile);
  },

  async createProfile(
    data: {
      id?: string;
      full_name: string;
      email: string;
      role: UserRole;
      status: UserStatus;
      department_id: string | null;
      subject_id: string | null;
      avatar_url?: string;
    },
    callerProfile: Profile | null,
    initialPassword?: string
  ): Promise<Profile> {
    await ensureSupabaseConfigLoaded();
    const cleanDeptId = sanitizeDepartmentId(data.department_id);
    const cleanSubjId = sanitizeSubjectId(data.subject_id);
    const pwdToStore = (initialPassword && initialPassword.trim()) ? initialPassword.trim() : 'Giaovien@123';
    const id = data.id && isValidUUID(data.id) ? data.id : crypto.randomUUID();

    const client = getSupabaseClient();
    let savedProfile: Profile | null = null;
    let lastError: string | null = null;

    if (client) {
      try {
        const { data: inserted, error } = await client
          .from('profiles')
          .insert({
            id,
            full_name: data.full_name.trim(),
            email: data.email.trim().toLowerCase(),
            role: data.role,
            status: data.status,
            department_id: cleanDeptId,
            subject_id: cleanSubjId,
            avatar_url: data.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.full_name)}`,
            password: pwdToStore,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select(`
            id,
            full_name,
            email,
            avatar_url,
            department_id,
            subject_id,
            role,
            status,
            password,
            created_at,
            updated_at,
            department:departments!profiles_department_id_fkey(id, name, description),
            subject:subjects!profiles_subject_id_fkey(id, name, code)
          `)
          .single();

        if (!error && inserted) {
          savedProfile = inserted as unknown as Profile;
        } else if (error) {
          lastError = error.message;
          console.warn('[Supabase] createProfile error:', error.message);
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
        console.warn('[Supabase] createProfile exception:', err);
      }
    }

    // If client failed or not configured, try server central API
    if (!savedProfile) {
      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            full_name: data.full_name,
            email: data.email,
            role: data.role,
            status: data.status,
            department_id: cleanDeptId,
            subject_id: cleanSubjId,
            avatar_url: data.avatar_url,
            password: pwdToStore,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            savedProfile = json.data as Profile;
          } else if (json.message) {
            lastError = json.message;
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          lastError = errData.message || `Server error (${res.status})`;
        }
      } catch (apiErr: any) {
        lastError = apiErr?.message || String(apiErr);
        console.warn('POST /api/users fallback failed:', apiErr);
      }
    }

    if (savedProfile) {
      MockDatabaseStore.getInstance().syncProfileFromLive(savedProfile, pwdToStore);
      realtimeService.broadcastLocalChange('profiles', 'INSERT', savedProfile);
      return savedProfile;
    }

    // If online was attempted and failed, do not silently swallow unless strictly offline
    if (lastError && (lastError.includes('duplicate key') || lastError.includes('already exists') || lastError.includes('đã tồn tại'))) {
      throw new Error(`Email ${data.email} đã tồn tại trong hệ thống.`);
    }

    // Offline fallback to mockStore
    const localProfile = MockDatabaseStore.getInstance().createProfile(
      {
        full_name: data.full_name,
        email: data.email,
        role: data.role,
        status: data.status,
        department_id: cleanDeptId,
        subject_id: cleanSubjId,
        avatar_url: data.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.full_name)}`,
      },
      callerProfile,
      pwdToStore
    );
    realtimeService.broadcastLocalChange('profiles', 'INSERT', localProfile);
    return localProfile;
  },

  async resetPassword(
    targetUserId: string,
    newPassword: string,
    callerProfile: Profile | null
  ): Promise<{ success: boolean; newPassword: string; user?: Profile }> {
    await ensureSupabaseConfigLoaded();
    const client = getSupabaseClient();
    const trimmed = newPassword.trim();

    if (client) {
      try {
        await client
          .from('profiles')
          .update({ password: trimmed, updated_at: new Date().toISOString() })
          .eq('id', targetUserId);
      } catch (err) {
        console.warn('Live reset password error, trying /api/users:', err);
      }
    }

    try {
      await fetch(`/api/users/${targetUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmed }),
      });
    } catch {
      // ignore
    }

    MockDatabaseStore.getInstance().setUserPassword(targetUserId, trimmed);
    realtimeService.broadcastLocalChange('profiles', 'UPDATE', { id: targetUserId, password: trimmed });
    return MockDatabaseStore.getInstance().resetPassword(targetUserId, newPassword, callerProfile);
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    callerProfile: Profile | null
  ): Promise<{ success: boolean; message: string }> {
    await ensureSupabaseConfigLoaded();
    const client = getSupabaseClient();
    const trimmedNew = newPassword.trim();

    if (client) {
      try {
        await client
          .from('profiles')
          .update({ password: trimmedNew, updated_at: new Date().toISOString() })
          .eq('id', userId);
      } catch (err) {
        console.warn('Live change password error:', err);
      }
    }

    try {
      await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmedNew }),
      });
    } catch {
      // ignore
    }

    MockDatabaseStore.getInstance().setUserPassword(userId, trimmedNew);
    realtimeService.broadcastLocalChange('profiles', 'UPDATE', { id: userId, password: trimmedNew });
    return MockDatabaseStore.getInstance().changeOwnPassword(userId, currentPassword, newPassword);
  },

  async deleteProfile(
    userId: string,
    callerProfile: Profile | null
  ): Promise<void> {
    await ensureSupabaseConfigLoaded();
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('profiles').delete().eq('id', userId);
        if (!error) {
          MockDatabaseStore.getInstance().deleteProfile(userId, callerProfile);
          realtimeService.broadcastLocalChange('profiles', 'DELETE', { id: userId });
          return;
        }
      } catch (err: any) {
        console.warn('Supabase delete profile failed, trying /api/users:', err);
      }
    }

    try {
      await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    } catch {
      // ignore
    }

    MockDatabaseStore.getInstance().deleteProfile(userId, callerProfile);
    realtimeService.broadcastLocalChange('profiles', 'DELETE', { id: userId });
  },
};
