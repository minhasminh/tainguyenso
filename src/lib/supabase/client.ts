import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  isValidSupabaseUrl,
  isValidSupabaseKey,
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY,
} from '../supabase';

export { isValidSupabaseUrl, isValidSupabaseKey, DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY };

const STORAGE_KEY_URL = 'app_supabase_url';
const STORAGE_KEY_KEY = 'app_supabase_anon_key';

let cachedServerUrl: string | null = null;
let cachedServerKey: string | null = null;
let serverConfigLoaded = false;
let serverConfigPromise: Promise<void> | null = null;

export function getSupabaseCredentials(): { url: string; anonKey: string; isLiveConfigured: boolean } {
  const envUrl = (
    (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : '') ||
    (typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_URL : '') ||
    DEFAULT_SUPABASE_URL
  ).trim();
  const envKey = (
    (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : '') ||
    (typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_ANON_KEY : '') ||
    DEFAULT_SUPABASE_ANON_KEY
  ).trim();

  const storedUrl = typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY_URL) || '').trim() : '';
  const storedKey = typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY_KEY) || '').trim() : '';

  // Ưu tiên: 1. Biến môi trường Vite (build time) -> 2. Cấu hình máy chủ -> 3. Cấu hình local storage tùy chỉnh -> 4. Giá trị mặc định
  const urlCandidate = [envUrl, cachedServerUrl, storedUrl, DEFAULT_SUPABASE_URL].find(isValidSupabaseUrl) || DEFAULT_SUPABASE_URL;
  const keyCandidate = [envKey, cachedServerKey, storedKey, DEFAULT_SUPABASE_ANON_KEY].find(isValidSupabaseKey) || DEFAULT_SUPABASE_ANON_KEY;

  const isLiveConfigured = isValidSupabaseUrl(urlCandidate) && isValidSupabaseKey(keyCandidate);

  return { url: urlCandidate, anonKey: keyCandidate, isLiveConfigured };
}

let supabaseInstance: SupabaseClient | null = null;

export async function ensureSupabaseConfigLoaded(): Promise<boolean> {
  if (serverConfigLoaded) {
    return getSupabaseCredentials().isLiveConfigured;
  }

  if (serverConfigPromise) {
    await serverConfigPromise;
    return getSupabaseCredentials().isLiveConfigured;
  }

  serverConfigPromise = (async () => {
    try {
      const res = await fetch('/api/config/supabase');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url && data.anonKey && data.isConfigured) {
          cachedServerUrl = data.url;
          cachedServerKey = data.anonKey;
          supabaseInstance = null; // Recreate with central credentials
        }
      }
    } catch {
      // Ignore network errors on init
    } finally {
      serverConfigLoaded = true;
      serverConfigPromise = null;
    }
  })();

  await serverConfigPromise;
  return getSupabaseCredentials().isLiveConfigured;
}

// Automatically trigger server config load on module load in browser
if (typeof window !== 'undefined') {
  ensureSupabaseConfigLoaded().catch(() => {});
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isLiveConfigured } = getSupabaseCredentials();

  if (!isLiveConfigured) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
    } catch (e) {
      console.error('Failed to create Supabase client:', e);
      return null;
    }
  }

  return supabaseInstance;
}

export async function saveCustomSupabaseCredentials(url: string, anonKey: string): Promise<void> {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();

  cachedServerUrl = cleanUrl;
  cachedServerKey = cleanKey;
  supabaseInstance = null; // reset to force re-instantiation

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
    localStorage.setItem(STORAGE_KEY_KEY, cleanKey);

    // Save to central server so ALL machines get it automatically
    try {
      await fetch('/api/config/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl, anonKey: cleanKey }),
      });
    } catch (err) {
      console.warn('Could not persist credentials to server:', err);
    }
  }
}

export async function clearCustomSupabaseCredentials(): Promise<void> {
  cachedServerUrl = null;
  cachedServerKey = null;
  supabaseInstance = null;

  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
  }
}

export async function testConnection(): Promise<{ success: boolean; message: string }> {
  await ensureSupabaseConfigLoaded();
  const { url } = getSupabaseCredentials();
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Chưa cấu hình VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY hợp lệ.',
    };
  }

  try {
    const { data, error } = await client.from('departments').select('count', { count: 'exact', head: true });
    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        return {
          success: false,
          message: `Kết nối đến Supabase Cloud (${url}) thành công! Tuy nhiên cơ sở dữ liệu chưa có bảng dữ liệu (Bảng '${error.message}'). Vui lòng copy mã SQL bên dưới và nhấn 'Run' trên Supabase Dashboard -> SQL Editor để tạo bảng.`,
        };
      }
      return {
        success: false,
        message: `Lỗi kết nối Supabase: ${error.message} (Mã lỗi: ${error.code})`,
      };
    }
    return {
      success: true,
      message: 'Kết nối Supabase thành công! Database và RLS sẵn sàng hoạt động.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Không thể kết nối đến máy chủ Supabase: ${err.message || 'Lỗi mạng'}`,
    };
  }
}
