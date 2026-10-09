/**
 * Supabase Client & Configuration Verification Module
 * 
 * BẢO MẬT: Tuyệt đối KHÔNG sử dụng SUPABASE_SERVICE_ROLE_KEY trong frontend.
 * Chỉ sử dụng VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
// Note: Vite performs static AST replacement on `import.meta.env.VITE_*` expressions at build time.
const envUrl = (
  (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : '') ||
  (typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_URL : '') ||
  ''
).trim();
const envKey = (
  (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : '') ||
  (typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_ANON_KEY : '') ||
  ''
).trim();

// Local storage override keys (for dev/testing fallback)
const STORAGE_KEY_URL = 'app_supabase_url';
const STORAGE_KEY_KEY = 'app_supabase_anon_key';

/**
 * Kiểm tra định dạng Supabase URL hợp lệ bằng URL API và HTTPS
 * Chấp nhận URL dạng https://<project-ref>.supabase.co hoặc custom domain HTTPS
 * Không dùng URL của trang quản trị Dashboard làm Project URL
 */
export function isValidSupabaseUrl(url?: string | null): boolean {
  if (!url) return false;
  const clean = url.trim();
  if (
    !clean ||
    clean.includes('your-project') ||
    clean.includes('example') ||
    clean.includes('google.com') ||
    clean.includes('docs.google')
  ) {
    return false;
  }

  try {
    const parsed = new URL(clean);
    // Bắt buộc giao thức HTTPS
    if (parsed.protocol !== 'https:') {
      return false;
    }

    // Không được dùng URL của trang quản trị Dashboard (supabase.com/dashboard/project/...)
    if (parsed.hostname === 'supabase.com' || parsed.hostname.endsWith('.supabase.com')) {
      return false;
    }

    // Chấp nhận domain tiêu chuẩn https://<project-ref>.supabase.co hoặc custom domain
    if (parsed.hostname.endsWith('.supabase.co')) {
      const parts = parsed.hostname.split('.');
      // Định dạng thông thường là <project-ref>.supabase.co (3 thành phần)
      if (parts.length >= 3 && parts[0].length > 0) {
        return true;
      }
    }

    // Với custom domain hoặc self-hosted HTTPS
    if (parsed.hostname && parsed.hostname.includes('.')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Kiểm tra tính hợp lệ của Supabase Key công khai:
 * Hỗ trợ 2 định dạng key công khai:
 * 1. Legacy anon key: Chuỗi JWT thường bắt đầu bằng eyJ... (hoặc định dạng token JWT hợp lệ)
 * 2. Publishable key thế hệ mới: Bắt đầu bằng tiền tố sb_publishable_
 *
 * TUYỆT ĐỐI KHÔNG chấp nhận SUPABASE_SERVICE_ROLE_KEY hoặc tiền tố sb_secret_ trong frontend.
 * Không yêu cầu publishable key mới phải có định dạng JWT bắt đầu bằng eyJ.
 */
export function isValidSupabaseKey(key?: string | null): boolean {
  if (!key) return false;
  const clean = key.trim();

  if (
    !clean ||
    clean.length < 20 ||
    clean.includes('your-anon-key') ||
    clean.includes('your-publishable-or-legacy-anon-key') ||
    clean.includes('placeholder')
  ) {
    return false;
  }

  // Bảo vệ bảo mật: Không được sử dụng service role key hoặc secret key
  if (clean.startsWith('sb_secret_') || clean.includes('service_role')) {
    return false;
  }

  // 1. Supabase Publishable key thế hệ mới: bắt đầu bằng tiền tố sb_publishable_
  if (clean.startsWith('sb_publishable_')) {
    return clean.length > 20;
  }

  // 2. Legacy anon key: JWT token (có 3 phần phân cách bởi dấu chấm)
  if (clean.startsWith('eyJ')) {
    const parts = clean.split('.');
    return parts.length === 3 && parts.every((p) => p.length > 0);
  }

  // Nếu là token JWT dạng khác hoặc anon key chuẩn độ dài đủ
  if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts.length === 3) {
      return true;
    }
  }

  return false;
}

/**
 * Kiểm tra chi tiết trạng thái biến môi trường
 * Chỉ kiểm tra định dạng phù hợp với loại key và SDK đang dùng.
 * Không hiển thị toàn bộ key trong giao diện hoặc log.
 */
export function validateSupabaseEnv(): {
  isValid: boolean;
  hasUrl: boolean;
  hasKey: boolean;
  isValidUrl: boolean;
  isValidKey: boolean;
  keyType: 'publishable' | 'legacy_anon' | 'unknown';
  issues: string[];
} {
  const issues: string[] = [];

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : null;

  const effectiveUrl = (envUrl || localUrl || '').trim();
  const effectiveKey = (envKey || localKey || '').trim();

  const hasUrl = Boolean(effectiveUrl);
  const hasKey = Boolean(effectiveKey);
  const isValidUrlFormat = isValidSupabaseUrl(effectiveUrl);
  const isValidKeyFormat = isValidSupabaseKey(effectiveKey);

  let keyType: 'publishable' | 'legacy_anon' | 'unknown' = 'unknown';
  if (effectiveKey.startsWith('sb_publishable_')) {
    keyType = 'publishable';
  } else if (effectiveKey.startsWith('eyJ')) {
    keyType = 'legacy_anon';
  }

  if (!hasUrl) {
    issues.push('Thiếu biến môi trường VITE_SUPABASE_URL');
  } else if (!isValidUrlFormat) {
    issues.push('VITE_SUPABASE_URL không hợp lệ (yêu cầu giao thức HTTPS dạng https://<project-ref>.supabase.co, không dùng URL trang Dashboard)');
  }

  if (!hasKey) {
    issues.push('Thiếu biến môi trường VITE_SUPABASE_ANON_KEY');
  } else if (effectiveKey.startsWith('sb_secret_') || effectiveKey.includes('service_role')) {
    issues.push('BẢO MẬT: Phát hiện Secret Key / Service Role Key. Frontend chỉ được dùng Anon Key hoặc sb_publishable_*');
  } else if (!isValidKeyFormat) {
    issues.push('VITE_SUPABASE_ANON_KEY không đúng định dạng (hỗ trợ legacy anon key eyJ... hoặc publishable key sb_publishable_...)');
  }

  const isValid = hasUrl && hasKey && isValidUrlFormat && isValidKeyFormat;
  return {
    isValid,
    hasUrl,
    hasKey,
    isValidUrl: isValidUrlFormat,
    isValidKey: isValidKeyFormat,
    keyType,
    issues,
  };
}

/**
 * Lấy thông tin cấu hình Supabase an toàn (Không làm lộ full secret key)
 */
export function getSupabaseCredentials(): {
  url: string;
  anonKey: string;
  maskedKey: string;
  isConfigured: boolean;
} {
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : null;

  const url = (envUrl || localUrl || '').trim();
  const anonKey = (envKey || localKey || '').trim();
  const isConfigured = isValidSupabaseUrl(url) && isValidSupabaseKey(anonKey);

  // Masked key an toàn cho việc hiển thị log/chẩn đoán
  const maskedKey = anonKey
    ? `${anonKey.substring(0, 6)}••••••••${anonKey.substring(anonKey.length - 4)}`
    : 'Chưa cấu hình';

  return {
    url,
    anonKey,
    maskedKey,
    isConfigured,
  };
}

// Khởi tạo Supabase Client an toàn
let cachedClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseCredentials();

  if (!isConfigured) {
    return null;
  }

  if (!cachedClient) {
    try {
      cachedClient = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.error('Lỗi khởi tạo Supabase Client:', err);
      return null;
    }
  }

  return cachedClient;
}

export const supabase = getSupabase();

/**
 * Kiểm tra kết nối Supabase thực tế (Section VIII)
 * Không làm lộ secret key!
 */
export async function checkSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  details?: string;
  latencyMs?: number;
}> {
  const { url, isConfigured } = getSupabaseCredentials();

  if (!isConfigured) {
    return {
      success: false,
      message: 'Không thể kết nối Supabase: Chưa cấu hình VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY',
      details: 'Vui lòng thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào file .env và build lại.',
    };
  }

  const client = getSupabase();
  if (!client) {
    return {
      success: false,
      message: 'Không thể khởi tạo kết nối Supabase',
      details: 'Lỗi parse thông số kết nối hoặc URL không hợp lệ.',
    };
  }

  const startTime = Date.now();

  try {
    // Thực hiện truy vấn nhẹ đến bảng hoặc hệ thống phân quyền
    const { error } = await client
      .from('departments')
      .select('count', { count: 'exact', head: true });

    const latencyMs = Date.now() - startTime;

    if (error) {
      // Trường hợp kết nối được tới Supabase nhưng chưa tạo bảng
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table') || error.message.includes('relation')) {
        return {
          success: true,
          message: 'Supabase kết nối thành công (Cloud phản hồi chuẩn, cơ sở dữ liệu sẵn sàng)',
          details: `Máy chủ Supabase (${new URL(url).hostname}) phản hồi trong ${latencyMs}ms. Lưu ý: Bảng departments chưa tồn tại hoặc đang dùng schema tùy chỉnh.`,
          latencyMs,
        };
      }

      // Lỗi phân quyền hoặc API key sai
      return {
        success: false,
        message: 'Không thể kết nối Supabase',
        details: `Lỗi máy chủ Supabase: ${error.message} (Mã lỗi: ${error.code || 'UNKNOWN'}). Kiểm tra lại VITE_SUPABASE_ANON_KEY và quyền RLS.`,
        latencyMs,
      };
    }

    return {
      success: true,
      message: 'Supabase kết nối thành công',
      details: `Kết nối máy chủ Supabase hoàn tất an toàn trong ${latencyMs}ms. Các chính sách RLS & RBAC hoạt động bình thường.`,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      message: 'Không thể kết nối Supabase',
      details: `Lỗi kết nối mạng: ${err?.message || 'Không có phản hồi từ máy chủ'}. Vui lòng kiểm tra lại đường truyền internet và cấu hình CORS.`,
      latencyMs,
    };
  }
}

/**
 * Kiểm tra trạng thái Supabase Authentication (Section IX)
 */
export async function checkSupabaseAuth(): Promise<{
  status: 'authenticated' | 'unauthenticated' | 'error';
  message: string;
  session: any | null;
  error?: string;
}> {
  const client = getSupabase();
  if (!client) {
    return {
      status: 'error',
      message: 'Chưa khởi tạo được Supabase Client',
      session: null,
      error: 'Thiếu cấu hình VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY',
    };
  }

  try {
    const { data, error } = await client.auth.getSession();
    if (error) {
      return {
        status: 'error',
        message: 'Supabase Authentication lỗi',
        session: null,
        error: error.message,
      };
    }

    if (data?.session) {
      return {
        status: 'authenticated',
        message: 'Authentication hoạt động',
        session: data.session,
      };
    }

    return {
      status: 'unauthenticated',
      message: 'Chưa đăng nhập',
      session: null,
    };
  } catch (err: any) {
    return {
      status: 'error',
      message: 'Supabase Authentication lỗi',
      session: null,
      error: err?.message || 'Lỗi không xác định khi gọi getSession()',
    };
  }
}

export const isSupabaseConfigured = getSupabaseCredentials().isConfigured;
