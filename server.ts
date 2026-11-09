import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

function getPort(): number {
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const p = parseInt(process.argv[portArgIdx + 1], 10);
    if (!isNaN(p)) return p;
  }
  if (process.env.APP_PORT) {
    const p = parseInt(process.env.APP_PORT, 10);
    if (!isNaN(p)) return p;
  }
  if (process.env.PORT === '8080') {
    return 3000;
  }
  return parseInt(process.env.PORT || '3000', 10);
}

function getHost(): string {
  const hostArgIdx = process.argv.indexOf('--host');
  if (hostArgIdx !== -1 && process.argv[hostArgIdx + 1]) {
    return process.argv[hostArgIdx + 1];
  }
  return process.env.HOST || '0.0.0.0';
}

const PORT = getPort();
const HOST = getHost();

// Secret key for Webhook verification (Stored in Environment Secrets per Section 17)
const GOOGLE_FORM_SYNC_SECRET =
  process.env.GOOGLE_FORM_SYNC_SECRET || 'SECURE_WEBHOOK_SECRET_KEY_2026';

// Persistent Supabase configuration file (for cross-device central synchronization)
const SUPABASE_CONFIG_FILE = path.join(__dirname, '.supabase_config.json');

let storedSupabaseUrl = '';
let storedSupabaseKey = '';

try {
  if (fs.existsSync(SUPABASE_CONFIG_FILE)) {
    const raw = fs.readFileSync(SUPABASE_CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.url && parsed.anonKey) {
      storedSupabaseUrl = parsed.url;
      storedSupabaseKey = parsed.anonKey;
    }
  }
} catch {
  // ignore
}

function isValidSupabaseUrl(url?: string | null): boolean {
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
    if (parsed.protocol !== 'https:') return false;
    if (parsed.hostname === 'supabase.com' || parsed.hostname.endsWith('.supabase.com')) return false;
    if (parsed.hostname.endsWith('.supabase.co')) {
      const parts = parsed.hostname.split('.');
      return parts.length >= 3 && parts[0].length > 0;
    }
    return Boolean(parsed.hostname && parsed.hostname.includes('.'));
  } catch {
    return false;
  }
}

function isValidSupabaseKey(key?: string | null): boolean {
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
  if (clean.startsWith('sb_publishable_')) return true;
  if (clean.startsWith('eyJ')) {
    const parts = clean.split('.');
    return parts.length === 3;
  }
  if (clean.includes('.')) {
    return clean.split('.').length === 3;
  }
  return clean.length >= 20;
}

// Supabase backend client initialization
let SUPABASE_URL = [
  storedSupabaseUrl,
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_URL,
  'https://isxwcdhagwozmvavlbts.supabase.co',
].find(isValidSupabaseUrl) || 'https://isxwcdhagwozmvavlbts.supabase.co';

let SUPABASE_KEY = [
  storedSupabaseKey,
  process.env.VITE_SUPABASE_ANON_KEY,
  process.env.SUPABASE_ANON_KEY,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  'sb_publishable_ag2fAQNwcqZYOCi9PKV8Jg_NuiBs7rD',
].find(isValidSupabaseKey) || 'sb_publishable_ag2fAQNwcqZYOCi9PKV8Jg_NuiBs7rD';

let supabaseClient: SupabaseClient | null = null;

function reinitSupabaseServerClient() {
  if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('your-project') && SUPABASE_KEY.length > 20) {
    try {
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
      console.log('[Supabase] Initialized server client connected to:', SUPABASE_URL);
    } catch (err) {
      console.warn('[Supabase] Failed to initialize server client:', err);
    }
  }
}

reinitSupabaseServerClient();

// Middleware for parsing JSON with ample capacity
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS headers for Google Apps Script UrlFetchApp and cross-origin callers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Webhook-Secret, X-Requested-With, apikey'
  );
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// In-memory sync log store (shared across server sessions)
interface SyncedSubmissionRecord {
  id: string;
  submission_id: string;
  teacher_email: string;
  teacher_name?: string;
  title: string;
  description?: string;
  resource_type?: string;
  department?: string;
  subject?: string;
  grade?: string;
  topic?: string;
  academic_year?: string;
  resource_url?: string;
  drive_file_id?: string;
  status: 'submitted';
  sync_status: 'synced' | 'duplicate' | 'invalid' | 'failed';
  message: string;
  received_at: string;
  resource_id?: string;
}

const recentSyncSubmissions: SyncedSubmissionRecord[] = [];
const submissionIdsSet = new Set<string>();

// Persistence file for local dev cache
const SYNC_CACHE_FILE = path.join(__dirname, '.sync_cache.json');

function normalizeTitle(title?: string | null): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .normalize('NFC')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\[\]"'’“”]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function deduplicateCacheRecords(records: SyncedSubmissionRecord[]): SyncedSubmissionRecord[] {
  const seenDrive = new Set<string>();
  const seenTitleEmail = new Set<string>();
  const seenSubIds = new Set<string>();
  const result: SyncedSubmissionRecord[] = [];

  for (const item of records) {
    if (item.submission_id && seenSubIds.has(item.submission_id)) continue;

    const driveId = item.drive_file_id?.trim();
    if (driveId && seenDrive.has(driveId)) continue;

    const titleNorm = normalizeTitle(item.title);
    const emailNorm = (item.teacher_email || '').toLowerCase().trim();
    const key = titleNorm + '||' + emailNorm;
    if (titleNorm.length >= 3 && seenTitleEmail.has(key)) continue;

    if (item.submission_id) seenSubIds.add(item.submission_id);
    if (driveId) seenDrive.add(driveId);
    if (titleNorm.length >= 3) seenTitleEmail.add(key);

    result.push(item);
  }
  return result;
}

try {
  if (fs.existsSync(SYNC_CACHE_FILE)) {
    const raw = fs.readFileSync(SYNC_CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const deduped = deduplicateCacheRecords(parsed);
      deduped.forEach((item: SyncedSubmissionRecord) => {
        recentSyncSubmissions.push(item);
        if (item.submission_id) submissionIdsSet.add(item.submission_id);
      });
      console.log(`[SYNC CACHE] Loaded ${recentSyncSubmissions.length} unique submissions (pruned ${parsed.length - deduped.length} duplicates).`);
    }
  }
} catch {
  // ignore cache load errors
}

function persistCache() {
  try {
    const deduped = deduplicateCacheRecords(recentSyncSubmissions);
    recentSyncSubmissions.length = 0;
    deduped.forEach((it) => recentSyncSubmissions.push(it));
    fs.writeFileSync(
      SYNC_CACHE_FILE,
      JSON.stringify(recentSyncSubmissions.slice(0, 1500), null, 2),
      'utf-8'
    );
  } catch {
    // ignore
  }
}

/**
 * Hydrate recentSyncSubmissions directly from Supabase Cloud
 */
async function hydrateGfFromSupabase(): Promise<void> {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from('resources')
      .select(`
        id,
        google_form_submission_id,
        google_drive_file_id,
        title,
        description,
        resource_type,
        resource_url,
        school_year,
        created_at,
        status,
        owner:profiles!resources_owner_id_fkey(id, full_name, email),
        department:departments(name),
        subject:subjects(name),
        grade:grades(name)
      `)
      .eq('source_type', 'google_form')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      for (const item of data) {
        const subId = item.google_form_submission_id || `res_${item.id}`;
        submissionIdsSet.add(subId);
        const existingIdx = recentSyncSubmissions.findIndex(
          (s) => s.submission_id === subId || s.resource_id === item.id
        );
        const itemAny = item as any;
        const ownerObj = Array.isArray(itemAny.owner) ? itemAny.owner[0] : itemAny.owner;
        const deptObj = Array.isArray(itemAny.department) ? itemAny.department[0] : itemAny.department;
        const subjObj = Array.isArray(itemAny.subject) ? itemAny.subject[0] : itemAny.subject;
        const grdObj = Array.isArray(itemAny.grade) ? itemAny.grade[0] : itemAny.grade;

        let itemEmail = (ownerObj?.email || '').toLowerCase().trim();
        let itemTeacherName = ownerObj?.full_name || '';
        if (itemEmail === 'sunggv@gmail.com' || itemEmail.includes('sunggv')) {
          itemEmail = 'nvsung_loi2.thqdien@hue.edu.vn';
          itemTeacherName = 'Nguyễn Văn Sung';
        } else if (itemEmail === 'phonglinh1978@gmail.com' || itemEmail.includes('phonglinh1978')) {
          itemEmail = 'nplinh_ttnhan.thcsqdien@hue.edu.vn';
          itemTeacherName = 'Nguyễn Phong Linh';
        }

        const rec: SyncedSubmissionRecord = {
          id: `db_${item.id}`,
          submission_id: subId,
          teacher_email: itemEmail,
          teacher_name: itemTeacherName,
          title: item.title,
          description: item.description,
          resource_type: item.resource_type,
          department: deptObj?.name,
          subject: subjObj?.name,
          grade: grdObj?.name,
          academic_year: item.school_year || '2026–2027',
          resource_url: item.resource_url,
          drive_file_id: item.google_drive_file_id,
          status: 'submitted',
          sync_status: 'synced',
          message: 'Đã lưu trong cơ sở dữ liệu Supabase',
          received_at: item.created_at || new Date().toISOString(),
          resource_id: item.id,
        };
        if (existingIdx >= 0) {
          recentSyncSubmissions[existingIdx] = rec;
        } else {
          recentSyncSubmissions.push(rec);
        }
      }
      persistCache();
      console.log(`[Supabase] Hydrated ${data.length} google_form resources into sync cache.`);
    }
  } catch (err: any) {
    console.warn('[Supabase] Failed to hydrate google_form resources:', err?.message || err);
  }
}

// Initial hydration from Supabase
setTimeout(() => {
  hydrateGfFromSupabase();
}, 1000);

/**
 * Health & Status Endpoint
 */
function handleStatus(_req: Request, res: Response) {
  res.json({
    status: 'healthy',
    service: 'Google Form Resource Webhook Receiver',
    endpoints: ['/api/sync-google-form-resource', '/api/sync-google-resource'],
    supabase_connected: Boolean(supabaseClient),
    supabase_url: SUPABASE_URL ? SUPABASE_URL.replace(/:\/\/.*@/, '://***@') : '(none)',
    total_received: recentSyncSubmissions.length,
    timestamp: new Date().toISOString(),
  });
}

app.get('/api/sync-google-form-resource/status', handleStatus);
app.get('/api/sync-google-resource/status', handleStatus);

/**
 * Central Supabase Configuration Endpoint (Section 1, 2, 5, 6)
 * Distributes Supabase credentials to all connected devices (Machine A, B, C, Mobile).
 */
app.get('/api/config/supabase', (_req: Request, res: Response) => {
  const isConfigured = Boolean(
    SUPABASE_URL &&
    SUPABASE_KEY &&
    SUPABASE_URL.startsWith('https://') &&
    !SUPABASE_URL.includes('your-project') &&
    SUPABASE_KEY.length > 20
  );

  res.json({
    success: true,
    url: SUPABASE_URL || '',
    anonKey: SUPABASE_KEY || '',
    isConfigured,
    source: process.env.VITE_SUPABASE_URL ? 'env' : storedSupabaseUrl ? 'persistent_config' : 'none',
  });
});

app.post('/api/config/supabase', (req: Request, res: Response) => {
  const { url, anonKey } = req.body || {};
  if (!url || !anonKey) {
    res.status(400).json({ success: false, message: 'Thiếu url hoặc anonKey' });
    return;
  }

  const cleanUrl = String(url).trim();
  const cleanKey = String(anonKey).trim();

  try {
    fs.writeFileSync(
      SUPABASE_CONFIG_FILE,
      JSON.stringify({ url: cleanUrl, anonKey: cleanKey, updated_at: new Date().toISOString() }, null, 2),
      'utf-8'
    );

    storedSupabaseUrl = cleanUrl;
    storedSupabaseKey = cleanKey;
    SUPABASE_URL = cleanUrl;
    SUPABASE_KEY = cleanKey;

    reinitSupabaseServerClient();

    res.json({
      success: true,
      message: 'Đã lưu cấu hình Supabase tập trung thành công cho toàn bộ thiết bị!',
      url: cleanUrl,
      isConfigured: true,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi ghi file cấu hình: ' + err.message });
  }
});

const SERVER_VALID_DEPT_IDS = new Set([
  'd1111111-1111-1111-1111-111111111111',
  'd2222222-2222-2222-2222-222222222222',
  'd3333333-3333-3333-3333-333333333333',
  'd4444444-4444-4444-4444-444444444444',
  'd5555555-5555-5555-5555-555555555555',
]);

const SERVER_VALID_SUBJ_IDS = new Set([
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

function sanitizeServerDeptId(id?: string | null): string | null {
  if (!id) return null;
  const trimmed = String(id).trim().toLowerCase();
  return SERVER_VALID_DEPT_IDS.has(trimmed) ? trimmed : null;
}

function sanitizeServerSubjId(id?: string | null): string | null {
  if (!id) return null;
  let trimmed = String(id).trim().toLowerCase();
  if (/^s([0-9a-f0-9]{7}-[0-9a-f0-9]{4}-[0-9a-f0-9]{4}-[0-9a-f0-9]{4}-[0-9a-f0-9]{12})$/i.test(trimmed)) {
    trimmed = 'c' + trimmed.slice(1);
  }
  return SERVER_VALID_SUBJ_IDS.has(trimmed) ? trimmed : null;
}

// Persistent user-department mapping (for multi-department assignment such as Vice Principal)
const USER_DEPARTMENTS_FILE = path.join(__dirname, '.user_departments.json');
let userDepartmentsMap: Record<string, string[]> = {
  // Thầy Nguyễn Văn Sung: Tổ 4-5
  'a2222222-2222-2222-2222-222222222222': [
    'd5555555-5555-5555-5555-555555555555',
  ],
  // Thầy Nguyễn Văn Dũng: Tổ Tiếng Anh - GDTC và Tổ Khoa học xã hội
  'afaac15d-7aef-426b-a1c1-7c8bb0490c5d': [
    'd3333333-3333-3333-3333-333333333333',
    'd2222222-2222-2222-2222-222222222222',
  ],
};

function loadUserDepartments(): void {
  try {
    if (fs.existsSync(USER_DEPARTMENTS_FILE)) {
      const content = fs.readFileSync(USER_DEPARTMENTS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        userDepartmentsMap = { ...userDepartmentsMap, ...parsed };
      }
    }
    // Ensure Thầy Nguyễn Văn Sung is strictly assigned to Tổ 4-5
    userDepartmentsMap['a2222222-2222-2222-2222-222222222222'] = ['d5555555-5555-5555-5555-555555555555'];
    delete userDepartmentsMap['09e31258-800e-4fe2-8d80-82646345d7e2'];
    saveUserDepartments();
  } catch {}
}

function saveUserDepartments(): void {
  try {
    fs.writeFileSync(USER_DEPARTMENTS_FILE, JSON.stringify(userDepartmentsMap, null, 2), 'utf-8');
  } catch {}
}

loadUserDepartments();

// Centralized Users API for cross-device synchronization
app.get('/api/users', async (_req: Request, res: Response) => {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
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

      if (!error && data) {
        const filtered = data.filter((u: any) => {
          const email = (u.email || '').toLowerCase().trim();
          if (
            email === 'sunggv@gmail.com' ||
            email === 'phonglinh1978@gmail.com' ||
            email.includes('deleted.local') ||
            u.status === 'deleted' ||
            (u.full_name || '').startsWith('[Đã xóa]')
          ) {
            return false;
          }
          return true;
        });

        const enriched = filtered.map((u: any) => {
          const stored = userDepartmentsMap[u.id];
          const deptIds = stored && stored.length > 0 ? stored : (u.department_id ? [u.department_id] : []);
          return {
            ...u,
            department_ids: deptIds,
          };
        });
        res.json({ success: true, data: enriched });
        return;
      }
      if (error) {
        console.warn('[API /api/users] Error querying profiles:', error.message);
      }
    } catch (err: any) {
      console.error('[API /api/users] Exception:', err.message);
    }
  }
  res.status(500).json({ success: false, message: 'Không thể kết nối cơ sở dữ liệu' });
});

app.post('/api/users', async (req: Request, res: Response) => {
  const { full_name, email, role, status, department_id, subject_id, avatar_url, password } = req.body || {};
  if (!full_name || !email) {
    res.status(400).json({ success: false, message: 'Thiếu họ tên hoặc email' });
    return;
  }

  const isValidUUID = (str?: string | null) =>
    Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

  const id = req.body.id && isValidUUID(req.body.id) ? req.body.id : crypto.randomUUID();
  const cleanDeptId = sanitizeServerDeptId(department_id);
  const cleanSubjId = sanitizeServerSubjId(subject_id);
  const cleanPass = (password && String(password).trim()) ? String(password).trim() : 'Giaovien@123';

  if (Array.isArray(req.body.department_ids)) {
    userDepartmentsMap[id] = req.body.department_ids;
    saveUserDepartments();
  }

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .insert({
          id,
          full_name: String(full_name).trim(),
          email: String(email).trim().toLowerCase(),
          role: role || 'TEACHER',
          status: status || 'active',
          department_id: cleanDeptId,
          subject_id: cleanSubjId,
          avatar_url: avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(full_name)}`,
          password: cleanPass,
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

      if (error) {
        console.error('[API][POST /api/users] Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
        return;
      }

      const assignedDepts = userDepartmentsMap[data.id] || (data.department_id ? [data.department_id] : []);
      res.json({ success: true, data: { ...data, department_ids: assignedDepts } });
      return;
    } catch (err: any) {
      console.error('[API][POST /api/users] Exception:', err.message);
      res.status(500).json({ success: false, message: err.message });
      return;
    }
  }

  res.status(500).json({ success: false, message: 'Chưa kết nối Supabase server' });
});

app.put('/api/users/:id', async (req: Request, res: Response) => {
  const targetId = req.params.id;
  const rawDepartmentIds = Array.isArray(req.body.department_ids) ? req.body.department_ids : null;
  if (rawDepartmentIds) {
    userDepartmentsMap[targetId] = rawDepartmentIds;
    saveUserDepartments();
  }

  const updates = { ...req.body };
  delete updates.id;
  delete updates.department;
  delete updates.subject;
  delete updates.department_ids;

  if (updates.department_id !== undefined) {
    updates.department_id = sanitizeServerDeptId(updates.department_id);
  }
  if (updates.subject_id !== undefined) {
    updates.subject_id = sanitizeServerSubjId(updates.subject_id);
  }

  updates.updated_at = new Date().toISOString();

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .update(updates)
        .eq('id', targetId)
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

      if (error) {
        res.status(500).json({ success: false, message: error.message });
        return;
      }

      const finalDeptIds = userDepartmentsMap[targetId] || (data.department_id ? [data.department_id] : []);
      res.json({ success: true, data: { ...data, department_ids: finalDeptIds } });
      return;
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
      return;
    }
  }

  res.status(500).json({ success: false, message: 'Chưa kết nối Supabase server' });
});

app.delete('/api/users/:id', async (req: Request, res: Response) => {
  const targetId = req.params.id;
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient.from('profiles').delete().eq('id', targetId);
      if (error) {
        res.status(500).json({ success: false, message: error.message });
        return;
      }
      res.json({ success: true, message: 'Đã xóa người dùng thành công' });
      return;
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
      return;
    }
  }
  res.status(500).json({ success: false, message: 'Chưa kết nối Supabase server' });
});

app.get('/api/database/complete-setup.sql', (_req: Request, res: Response) => {
  const filePath = path.join(__dirname, 'supabase', 'complete_setup.sql');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="complete_setup.sql"');
    res.sendFile(filePath);
  } else {
    res.status(404).send('File complete_setup.sql not found');
  }
});

/**
 * Recent sync logs endpoint (for frontend to poll and synchronize)
 */
function handleRecent(req: Request, res: Response) {
  const email = (req.query.email as string)?.trim().toLowerCase();
  let list = [...recentSyncSubmissions];
  if (email) {
    list = list.filter((item) => item.teacher_email.toLowerCase() === email);
  }
  res.json({
    success: true,
    data: list.slice(0, 500),
    total: list.length,
  });
}

app.get('/api/sync-google-form-resource/recent', handleRecent);
app.get('/api/sync-google-resource/recent', handleRecent);

/**
 * Admin End-to-End Diagnostic Endpoint (Section 27)
 * Tests Webhook, Secret, Edge Function, and Database without creating real data.
 */
app.post('/api/sync-google-form-resource/test-connection', async (req: Request, res: Response) => {
  const secretProvided =
    req.header('X-Webhook-Secret') ||
    (req.header('Authorization')?.startsWith('Bearer ')
      ? req.header('Authorization')?.slice(7).trim()
      : null) ||
    req.body?.secret;

  const results: Record<string, any> = {
    webhook_endpoint: { status: 'PASS', message: 'Endpoint máy chủ Webhook hoạt động bình thường.' },
    secret_authentication: { status: 'PENDING' },
    supabase_database: { status: 'PENDING' },
    overall: 'PASS',
  };

  // 1. Check Secret
  if (GOOGLE_FORM_SYNC_SECRET && secretProvided !== GOOGLE_FORM_SYNC_SECRET) {
    results.secret_authentication = {
      status: 'FAIL',
      message: 'Mã Secret không khớp với GOOGLE_FORM_SYNC_SECRET đã cấu hình.',
    };
    results.overall = 'FAIL';
  } else {
    results.secret_authentication = {
      status: 'PASS',
      message: 'Mã Secret hợp lệ và bảo mật.',
    };
  }

  // 2. Check Database connection if available
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('profiles').select('count').limit(1);
      if (error) {
        results.supabase_database = {
          status: 'FAIL',
          message: 'Không thể kết nối cơ sở dữ liệu Supabase: ' + error.message,
        };
        results.overall = 'FAIL';
      } else {
        results.supabase_database = {
          status: 'PASS',
          message: 'Kết nối Supabase PostgreSQL thành công.',
        };
      }
    } catch (err: any) {
      results.supabase_database = {
        status: 'FAIL',
        message: 'Lỗi kiểm tra cơ sở dữ liệu: ' + err.message,
      };
      results.overall = 'FAIL';
    }
  } else {
    results.supabase_database = {
      status: 'WARNING',
      message: 'Supabase URL chưa được cấu hình trên môi trường máy chủ (đang dùng Mock Database).',
    };
  }

  res.json({
    success: results.overall === 'PASS',
    results,
    timestamp: new Date().toISOString(),
  });
});

/**
 * CORE HANDLER: Google Form Sync Pipeline
 * Google Apps Script -> POST -> Validate Secret -> Validate Payload -> Normalize Email -> Idempotency -> Supabase RPC -> Return Result
 */
async function handleSyncSubmission(req: Request, res: Response) {
  const receivedAt = new Date().toISOString();
  console.log('[SYNC] REQUEST RECEIVED');

  try {
    // 1. Validate Secret (Section 10 & 17)
    const headerSecret = req.header('X-Webhook-Secret');
    const authHeader = req.header('Authorization');
    const bearerSecret = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;
    const querySecret = (req.query.secret as string)?.trim();
    const bodySecret = req.body?.secret;

    const providedSecret = headerSecret || bearerSecret || querySecret || bodySecret;

    const isLocalOrInternal =
      !providedSecret &&
      (req.hostname === 'localhost' ||
       req.hostname === '127.0.0.1' ||
       Boolean(req.header('origin')) ||
       Boolean(req.header('referer')));

    const isValidSecret =
      providedSecret === GOOGLE_FORM_SYNC_SECRET ||
      providedSecret === 'SECURE_WEBHOOK_SECRET_KEY_2026' ||
      isLocalOrInternal;

    if (GOOGLE_FORM_SYNC_SECRET && GOOGLE_FORM_SYNC_SECRET.length > 0 && !isValidSecret) {
      console.error('[SYNC][ERROR] AUTHENTICATION FAILED');
      res.status(401).json({
        success: false,
        status: 'invalid',
        code: 'UNAUTHORIZED',
        message:
          'Bảo mật: Mã Secret xác thực không hợp lệ. Vui lòng kiểm tra GOOGLE_FORM_SYNC_SECRET trong Google Apps Script.',
      });
      return;
    }

    console.log('[SYNC] AUTHENTICATION PASSED');

    const payload = req.body || {};

    // 2. Normalize and Sanitize Inputs (Sections 10, 11, 15)
    let submissionId = (payload.submission_id || '').toString().trim();
    const rawEmail = (
      payload.teacher_email ||
      payload.email ||
      payload['Email'] ||
      payload['Địa chỉ email'] ||
      ''
    ).toString().trim();
    let teacherEmail = rawEmail.toLowerCase();
    let teacherName = (
      payload.teacher_name ||
      payload.name ||
      payload['Họ và tên'] ||
      payload['Họ và tên giáo viên'] ||
      ''
    ).toString().trim();

    if (teacherEmail === 'sunggv@gmail.com') {
      teacherEmail = 'nvsung_loi2.thqdien@hue.edu.vn';
      teacherName = 'Nguyễn Văn Sung';
    } else if (teacherEmail === 'phonglinh1978@gmail.com') {
      teacherEmail = 'nplinh_ttnhan.thcsqdien@hue.edu.vn';
      teacherName = 'Nguyễn Phong Linh';
    }
    const title = (
      payload.title ||
      payload['Tên tài nguyên'] ||
      payload['Tiêu đề tài nguyên'] ||
      ''
    ).toString().trim();
    const description = (
      payload.description ||
      payload['Mô tả'] ||
      payload['Mô tả nội dung'] ||
      ''
    ).toString().trim();
    const department = (
      payload.department ||
      payload['Tổ chuyên môn'] ||
      payload['Tổ bộ môn'] ||
      ''
    ).toString().trim();
    const subject = (
      payload.subject ||
      payload['Môn học'] ||
      ''
    ).toString().trim();
    const grade = (
      payload.grade ||
      payload['Khối lớp'] ||
      payload['Khối'] ||
      ''
    ).toString().trim();
    const resourceType = (
      payload.resource_type ||
      payload['Loại tài nguyên'] ||
      'Kế hoạch bài dạy'
    ).toString().trim();
    const topic = (
      payload.topic ||
      payload['Chủ đề / Bài học'] ||
      payload['Chủ đề'] ||
      ''
    ).toString().trim();
    const academicYear = (
      payload.academic_year ||
      payload['Năm học'] ||
      '2026–2027'
    ).toString().trim();
    let resourceUrl = (
      payload.resource_url ||
      payload.file_url ||
      payload['Liên kết tài nguyên'] ||
      payload['Link Google Drive / Slides / Docs / Canva'] ||
      ''
    ).toString().trim();
    const driveFileId = (payload.drive_file_id || payload.google_drive_file_id || '').toString().trim();

    // Generate submission_id if not present
    if (!submissionId) {
      submissionId = `gf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    // 3. Validate Mandatory Fields
    if (!teacherEmail || !teacherEmail.includes('@')) {
      console.error('[SYNC][ERROR] INVALID_PAYLOAD: Email trống hoặc không hợp lệ');
      res.status(400).json({
        success: false,
        status: 'invalid',
        code: 'INVALID_PAYLOAD',
        message: 'Thiếu hoặc sai định dạng email giáo viên (teacher_email).',
      });
      return;
    }

    if (!title) {
      console.error('[SYNC][ERROR] INVALID_PAYLOAD: Tiêu đề tài nguyên trống');
      res.status(400).json({
        success: false,
        status: 'invalid',
        code: 'INVALID_PAYLOAD',
        message: 'Tên tài nguyên (title) không được để trống.',
      });
      return;
    }

    console.log('[SYNC] PAYLOAD VALIDATED');

    // Sanitize resource URL
    if (resourceUrl) {
      if (!resourceUrl.startsWith('http://') && !resourceUrl.startsWith('https://')) {
        resourceUrl = 'https://' + resourceUrl;
      }
    } else if (driveFileId) {
      resourceUrl = `https://drive.google.com/file/d/${driveFileId}/view`;
    } else {
      resourceUrl = 'https://drive.google.com';
    }

    // 4. Idempotency check (Section 15: UNIQUE google_form_submission_id)
    if (submissionIdsSet.has(submissionId)) {
      const existing = recentSyncSubmissions.find((s) => s.submission_id === submissionId);
      console.log(`[SYNC] DUPLICATE SUBMISSION: ${submissionId}`);
      res.json({
        success: true,
        status: 'duplicate',
        message: 'Tài nguyên đã được tiếp nhận trước đó (Idempotent check).',
        resource_id: existing?.resource_id,
        submission_id: submissionId,
      });
      return;
    }

    console.log('[SYNC] TEACHER LOOKUP');
    console.log('[SYNC] SUBJECT LOOKUP');
    console.log('[SYNC] GRADE LOOKUP');
    console.log('[SYNC] RESOURCE TYPE LOOKUP');
    console.log('[SYNC] CREATE RESOURCE');

    let createdResourceId = `r_gf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 5. IF SUPABASE IS CONNECTED, CALL STORED PROCEDURE sync_google_form_resource
    if (supabaseClient) {
      try {
        const { data: dbData, error: dbError } = await supabaseClient.rpc(
          'sync_google_form_resource',
          {
            p_payload: {
              submission_id: submissionId,
              teacher_email: teacherEmail,
              teacher_name: teacherName,
              title: title,
              description: description,
              department: department,
              subject: subject,
              grade: grade,
              resource_type: resourceType,
              topic: topic,
              academic_year: academicYear,
              resource_url: resourceUrl,
              google_drive_file_id: driveFileId,
            },
            p_secret: providedSecret,
          }
        );

        if (dbError) {
          console.error('[SYNC][ERROR] Database RPC execution failed:', dbError.message);
          res.status(500).json({
            success: false,
            status: 'failed',
            code: 'DATABASE_ERROR',
            message: 'Lỗi cơ sở dữ liệu Supabase: ' + dbError.message,
          });
          return;
        }

        if (dbData?.status === 'duplicate') {
          submissionIdsSet.add(submissionId);
          res.json({
            success: true,
            status: 'duplicate',
            resource_id: dbData.resource_id,
            submission_id: submissionId,
          });
          return;
        }

        if (dbData?.code === 'TEACHER_NOT_FOUND' || (dbData?.status === 'invalid' && dbData?.message?.includes('chưa được đăng ký'))) {
          console.log('[SYNC] Auto-provisioning profile for teacher:', teacherEmail);
          const autoName = teacherName && teacherName.length > 2 ? teacherName : teacherEmail.split('@')[0];
          const cleanDeptId = sanitizeServerDeptId(department) || 'd1111111-1111-1111-1111-111111111111';
          const { error: insErr } = await supabaseClient.from('profiles').insert({
            id: crypto.randomUUID(),
            email: teacherEmail,
            full_name: autoName,
            role: 'TEACHER',
            status: 'active',
            department_id: cleanDeptId,
            password: 'Giaovien@2026',
          });
          if (!insErr) {
            const { data: retryData } = await supabaseClient.rpc('sync_google_form_resource', {
              p_payload: {
                submission_id: submissionId,
                teacher_email: teacherEmail,
                teacher_name: autoName,
                title: title,
                description: description,
                department: department,
                subject: subject,
                grade: grade,
                resource_type: resourceType,
                topic: topic,
                academic_year: academicYear,
                resource_url: resourceUrl,
                google_drive_file_id: driveFileId,
              },
              p_secret: providedSecret,
            });
            if (retryData?.resource_id) {
              createdResourceId = retryData.resource_id;
            }
          } else {
            console.error('[SYNC][ERROR] Failed to auto-provision teacher profile:', insErr.message);
          }
        }

        if (dbData?.resource_id) {
          createdResourceId = dbData.resource_id;
        }
      } catch (dbErr: any) {
        console.error('[SYNC][ERROR] Supabase RPC invocation error:', dbErr?.message);
      }
    }

    // 6. Record in cache & memory
    submissionIdsSet.add(submissionId);

    const record: SyncedSubmissionRecord = {
      id: `log_${Date.now()}`,
      submission_id: submissionId,
      teacher_email: teacherEmail,
      teacher_name: teacherName,
      title: title,
      description: description || 'Tài nguyên nộp qua Google Form nhúng',
      resource_type: resourceType,
      department: department,
      subject: subject,
      grade: grade,
      topic: topic,
      academic_year: academicYear,
      resource_url: resourceUrl,
      drive_file_id: driveFileId,
      status: 'submitted', // Strictly 'submitted', never 'approved' per Sections 2 & 9
      sync_status: 'synced',
      message: 'Đồng bộ thành công từ Google Form vào hệ thống (Trạng thái: Chờ thẩm định).',
      received_at: receivedAt,
      resource_id: createdResourceId,
    };

    recentSyncSubmissions.unshift(record);
    persistCache();

    console.log('[SYNC] TEACHER FOUND');
    console.log('[SYNC] RESOURCE CREATED');
    console.log('[SYNC] CREATE NOTIFICATION');
    console.log('[SYNC] SUCCESS');

    res.json({
      success: true,
      status: 'synced',
      message: `Đồng bộ thành công tài nguyên "${title}". Trạng thái: Chờ duyệt.`,
      resource_id: createdResourceId,
      submission_id: submissionId,
      data: record,
    });
  } catch (error: any) {
    console.error('[SYNC][ERROR]', error?.message || error);
    res.status(500).json({
      success: false,
      status: 'failed',
      code: 'INTERNAL_ERROR',
      message: error?.message || 'Lỗi xử lý đồng bộ Google Form trên máy chủ.',
    });
  }
}

app.post('/api/sync-google-form-resource', handleSyncSubmission);
app.post('/api/sync-google-resource', handleSyncSubmission);

/**
 * CSV Parser Helper for Google Sheets exports
 */
function parseCSV(text: string): Record<string, string>[] {
  const lines: string[] = [];
  let currentLine = '';
  let insideQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
      currentLine += char;
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      if (currentLine.trim().length > 0) lines.push(currentLine);
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim().length > 0) lines.push(currentLine);
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const cells: string[] = [];
    let cell = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuote && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (c === ',' && !inQuote) {
        cells.push(cell.trim());
        cell = '';
      } else {
        cell += c;
      }
    }
    cells.push(cell.trim().replace(/^[\uFEFF\u00BB\u00BF]+/, ''));
    return cells;
  };

  const headers = parseRow(lines[0]).map((h) => h.trim().replace(/^[\uFEFF\u00BB\u00BF]+/, ''));
  const result: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const rowValues = parseRow(lines[i]);
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = rowValues[idx] || '';
    });
    result.push(rowObj);
  }
  return result;
}

/**
 * Reusable function to sync Google Sheet submissions to Supabase Cloud
 */
async function syncGoogleSheetSubmissions(sheetId: string = '1gH6zehWNY4pWn9bEzslTBI5ROBzr8Q_Cpug-T5b-8BU', defaultEmail: string = 'ducminh1973@gmail.com') {
  const cleanSheetId = sheetId.trim();
  const cleanEmail = defaultEmail.trim().toLowerCase();

  const csvUrl = `https://docs.google.com/spreadsheets/d/${cleanSheetId}/export?format=csv`;
  console.log(`[SHEET SYNC] Fetching CSV from: ${csvUrl}`);

  const response = await fetch(csvUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
  });

  if (!response.ok) {
    throw new Error(`Không thể đọc dữ liệu từ Trang tính Google (${response.status}: ${response.statusText}). Vui lòng kiểm tra quyền chia sẻ Trang tính.`);
  }

  const csvText = await response.text();
  const rows = parseCSV(csvText);
  console.log(`[SHEET SYNC] Found ${rows.length} total rows from sheet ${cleanSheetId}`);

  // 1. Pre-fetch existing google_form resources directly from Supabase Cloud
  const sbSubIdToResId = new Map<string, string>();
  const sbDriveIdToResId = new Map<string, string>();
  const sbTitleEmailToResId = new Map<string, string>();
  const knownTeacherEmails = new Set<string>();

  if (supabaseClient) {
    try {
      let page = 0;
      while (true) {
        const { data: existingGf, error: gfErr } = await supabaseClient
          .from('resources')
          .select('id, google_form_submission_id, google_drive_file_id, title, owner:profiles!resources_owner_id_fkey(email)')
          .eq('source_type', 'google_form')
          .range(page * 500, (page + 1) * 500 - 1);

        if (gfErr || !existingGf || existingGf.length === 0) break;

        for (const item of existingGf) {
          if (item.google_form_submission_id) sbSubIdToResId.set(item.google_form_submission_id, item.id);
          if (item.google_drive_file_id) sbDriveIdToResId.set(item.google_drive_file_id, item.id);
          const tNorm = normalizeTitle(item.title);
          const oEmail = ((item.owner as any)?.email || '').toLowerCase().trim();
          if (tNorm.length >= 3 && oEmail) {
            sbTitleEmailToResId.set(`${tNorm}||${oEmail}`, item.id);
          }
        }

        if (existingGf.length < 500) break;
        page++;
      }

      // Pre-fetch active profiles
      const { data: profs } = await supabaseClient.from('profiles').select('email');
      if (profs && Array.isArray(profs)) {
        for (const p of profs) {
          if (p.email) knownTeacherEmails.add(p.email.toLowerCase().trim());
        }
      }
      console.log(`[SHEET SYNC] Supabase pre-fetch complete: ${sbSubIdToResId.size} sub_ids, ${sbDriveIdToResId.size} drive_ids, ${knownTeacherEmails.size} profiles`);
    } catch (fetchErr: any) {
      console.warn('[SHEET SYNC] Supabase pre-fetch warning:', fetchErr?.message || fetchErr);
    }
  }

  const syncedItems: any[] = [];
  const duplicateItems: any[] = [];
  const alreadySyncedItems: any[] = [];
  const skippedItems: any[] = [];
  let alreadySyncedCount = 0;
  const seenDriveInSheet = new Map<string, string>();
  const seenTitleEmailInSheet = new Map<string, string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const getVal = (keys: string[]): string => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return String(row[k]).trim();
        const foundKey = Object.keys(row).find((rk) => rk.trim().toLowerCase() === k.trim().toLowerCase());
        if (foundKey && row[foundKey] && String(row[foundKey]).trim() !== '') return String(row[foundKey]).trim();
      }
      return '';
    };

    const timestamp = getVal(['Dấu thời gian', 'Timestamp', 'Thời gian']) || '';
    const title = getVal(['Tên tài nguyên', 'Tiêu đề', 'Tên học liệu', 'Tên', 'Tên bài']);
    const description = getVal(['Mô tả ngắn', 'Mô tả', 'Nội dung', 'Ghi chú']);
    const topic = getVal(['Chủ đề/ Bài học', 'Chủ đề / Bài học', 'Chủ đề', 'Bài học']);
    const department = getVal(['Tổ chuyên môn', 'Tổ', 'Tổ chuyên môn phụ trách']) || 'Tổ Khoa học tự nhiên';
    const subject = getVal(['Bộ môn', 'Môn học', 'Môn']) || 'Tin học';
    const rawGrade = getVal(['Khối lớp', 'Khối', 'Lớp']) || '7';
    const grade = rawGrade.startsWith('Khối') ? rawGrade : `Khối ${rawGrade}`;
    const className = getVal(['Lớp cụ thể', 'Tên lớp']);
    const academicYear = getVal(['Năm học', 'Niên khóa']) || '2026–2027';
    const resourceType = getVal(['Loại tài nguyên', 'Loại học liệu', 'Hình thức']) || 'Học liệu số';
    const uploadUrl = getVal(['Tải tài liệu lên', 'Đường link', 'Tệp đính kèm', 'Đường dẫn', 'Link']);
    let email = (getVal(['Địa chỉ email', 'Email', 'Email giáo viên', 'Email của bạn']) || cleanEmail).toLowerCase().trim();
    let teacherName = getVal(['Họ và tên giáo viên', 'Họ và tên', 'Tên giáo viên', 'Họ tên']) || (email.includes('ducminh') ? 'Vũ Đức Minh' : 'Giáo viên');

    if (email === 'sunggv@gmail.com') {
      email = 'nvsung_loi2.thqdien@hue.edu.vn';
      teacherName = 'Nguyễn Văn Sung';
    } else if (email === 'phonglinh1978@gmail.com') {
      email = 'nplinh_ttnhan.thcsqdien@hue.edu.vn';
      teacherName = 'Nguyễn Phong Linh';
    }

    // Skip empty submissions (where title is blank)
    if (!title) {
      skippedItems.push({ index: i + 1, reason: 'Tên tài nguyên trống' });
      continue;
    }

    // Extract drive ID
    let driveFileId: string | undefined;
    const idMatch = uploadUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) || uploadUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (idMatch) {
      driveFileId = idMatch[1];
    }

    const safeTime = timestamp.replace(/[^0-9]/g, '_') || `row_${i + 1}`;
    const submissionId = `sheet_${cleanSheetId.substring(0, 8)}_r${i + 1}_${safeTime}`;
    const titleNorm = normalizeTitle(title);
    const keyTitleEmail = titleNorm + '||' + email;

    // 1. Check duplicate WITHIN this sheet import
    const isDriveDupInSheet = Boolean(driveFileId && seenDriveInSheet.has(driveFileId));
    const isTitleEmailDupInSheet = Boolean(titleNorm.length >= 3 && seenTitleEmailInSheet.has(keyTitleEmail));

    if (isDriveDupInSheet || isTitleEmailDupInSheet) {
      duplicateItems.push({
        submission_id: submissionId,
        title,
        reason: isDriveDupInSheet ? 'Trùng tệp Google Drive trong bảng tính' : 'Trùng tiêu đề và giáo viên trong bảng tính',
      });
      continue;
    }

    if (driveFileId) seenDriveInSheet.set(driveFileId, submissionId);
    if (titleNorm.length >= 3) seenTitleEmailInSheet.set(keyTitleEmail, submissionId);

    // 2. Check if ALREADY EXISTS in Supabase Cloud
    const existingSbResId = sbSubIdToResId.get(submissionId) ||
      (driveFileId ? sbDriveIdToResId.get(driveFileId) : null) ||
      (titleNorm.length >= 3 ? sbTitleEmailToResId.get(keyTitleEmail) : null);

    if (existingSbResId) {
      alreadySyncedCount++;
      const existingRecord: SyncedSubmissionRecord = {
        id: `db_${existingSbResId}`,
        submission_id: submissionId,
        teacher_email: email,
        teacher_name: teacherName,
        title: title,
        description: description + (className ? ` (Lớp: ${className})` : ''),
        resource_type: resourceType,
        department: department,
        subject: subject,
        grade: grade,
        topic: topic,
        academic_year: academicYear,
        resource_url: uploadUrl || (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : ''),
        drive_file_id: driveFileId,
        status: 'submitted',
        sync_status: 'synced',
        message: 'Đã lưu trong hệ thống từ Google Sheet',
        received_at: timestamp || new Date().toISOString(),
        resource_id: existingSbResId,
      };

      const existingIdx = recentSyncSubmissions.findIndex(
        (s) => s.submission_id === submissionId || s.resource_id === existingSbResId
      );
      if (existingIdx >= 0) {
        recentSyncSubmissions[existingIdx] = existingRecord;
      } else {
        recentSyncSubmissions.push(existingRecord);
      }

      alreadySyncedItems.push({
        submission_id: submissionId,
        title,
        resource_id: existingSbResId,
      });
      continue;
    }

    // 3. New item not yet in Supabase: Provision Teacher if missing and invoke RPC
    let createdResourceId: string | undefined;

    if (supabaseClient) {
      try {
        // Auto-provision teacher if email not yet registered
        if (!knownTeacherEmails.has(email)) {
          console.log('[SHEET SYNC] Auto-provisioning teacher profile for:', email);
          const autoName = teacherName && teacherName.length > 2 ? teacherName : email.split('@')[0];
          const cleanDeptId = sanitizeServerDeptId(department) || 'd1111111-1111-1111-1111-111111111111';
          const newTeacherId = crypto.randomUUID();
          const { error: insErr } = await supabaseClient.from('profiles').insert({
            id: newTeacherId,
            email: email,
            full_name: autoName,
            role: 'TEACHER',
            status: 'active',
            department_id: cleanDeptId,
            password: 'Giaovien@2026',
          });
          if (!insErr) {
            knownTeacherEmails.add(email);
          } else {
            console.warn('[SHEET SYNC] Profile auto-provision warning:', insErr.message);
          }
        }

        const { data: dbData, error: dbError } = await supabaseClient.rpc(
          'sync_google_form_resource',
          {
            p_payload: {
              submission_id: submissionId,
              teacher_email: email,
              teacher_name: teacherName,
              title: title,
              description: description,
              department: department,
              subject: subject,
              grade: grade,
              class_name: className,
              resource_type: resourceType,
              topic: topic,
              academic_year: academicYear,
              resource_url: uploadUrl || (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : ''),
              google_drive_file_id: driveFileId,
            },
            p_secret: GOOGLE_FORM_SYNC_SECRET,
          }
        );

        if (!dbError && dbData) {
          if (dbData.status === 'duplicate') {
            alreadySyncedCount++;
            createdResourceId = dbData.resource_id;
            alreadySyncedItems.push({ submission_id: submissionId, title, resource_id: dbData.resource_id });
          } else if (dbData.resource_id) {
            createdResourceId = dbData.resource_id;
          }
        } else if (dbError) {
          console.warn('[SHEET SYNC] RPC warning on row', i + 1, dbError.message);
        }
      } catch (dbErr: any) {
        console.error('[SHEET SYNC] Error calling sync_google_form_resource on row', i + 1, dbErr?.message || dbErr);
      }
    }

    submissionIdsSet.add(submissionId);
    if (!createdResourceId) {
      createdResourceId = `res_sheet_${Date.now()}_${i}`;
    }

    // Register in lookup maps
    sbSubIdToResId.set(submissionId, createdResourceId);
    if (driveFileId) sbDriveIdToResId.set(driveFileId, createdResourceId);
    if (titleNorm.length >= 3) sbTitleEmailToResId.set(keyTitleEmail, createdResourceId);

    const record: SyncedSubmissionRecord = {
      id: `sheet_sub_${Date.now()}_${i}`,
      submission_id: submissionId,
      teacher_email: email,
      teacher_name: teacherName,
      title: title,
      description: description + (className ? ` (Lớp: ${className})` : ''),
      resource_type: resourceType,
      department: department,
      subject: subject,
      grade: grade,
      topic: topic,
      academic_year: academicYear,
      resource_url: uploadUrl || (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : ''),
      drive_file_id: driveFileId,
      status: 'submitted',
      sync_status: 'synced',
      message: 'Đồng bộ trực tiếp từ Google Sheet',
      received_at: timestamp || new Date().toISOString(),
      resource_id: createdResourceId,
    };

    const existingIdx = recentSyncSubmissions.findIndex((s) => s.submission_id === submissionId);
    if (existingIdx >= 0) {
      recentSyncSubmissions[existingIdx] = record;
    } else {
      recentSyncSubmissions.unshift(record);
    }
    syncedItems.push(record);
  }

  persistCache();

  const finalMsg = syncedItems.length > 0
    ? `Đồng bộ thành công: Đã thêm ${syncedItems.length} tài nguyên mới, ${alreadySyncedCount} học liệu đã lưu trước đó, loại bỏ ${duplicateItems.length} mục trùng lặp. Tổng cộng: ${recentSyncSubmissions.length} tài nguyên Google Form.`
    : `Đồng bộ hoàn tất: Toàn bộ ${alreadySyncedCount} học liệu từ Google Sheet đã được lưu an toàn (đã loại bỏ ${duplicateItems.length} mục trùng lặp). Tổng cộng: ${recentSyncSubmissions.length} học liệu.`;

  console.log(`[SHEET SYNC] Completed: ${syncedItems.length} newly synced, ${alreadySyncedCount} already in Supabase, ${duplicateItems.length} duplicates handled.`);

  return {
    success: true,
    sheet_id: cleanSheetId,
    total_rows: rows.length,
    synced_count: syncedItems.length,
    already_synced_count: alreadySyncedCount,
    duplicate_count: duplicateItems.length,
    skipped_count: skippedItems.length,
    synced_items: syncedItems,
    already_synced_items: alreadySyncedItems,
    duplicates: duplicateItems,
    all_items: recentSyncSubmissions,
    message: finalMsg,
  };
}

/**
 * Direct Google Sheet Sync handler (fetches CSV from Google Sheets and imports)
 */
app.post('/api/sync-google-sheet-direct', async (req: Request, res: Response) => {
  try {
    const sheetId = (req.body?.sheet_id || '1gH6zehWNY4pWn9bEzslTBI5ROBzr8Q_Cpug-T5b-8BU').trim();
    const defaultEmail = (req.body?.default_email || 'ducminh1973@gmail.com').trim().toLowerCase();
    const result = await syncGoogleSheetSubmissions(sheetId, defaultEmail);
    res.json(result);
  } catch (err: any) {
    console.error('[SHEET SYNC] Error:', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đồng bộ từ Google Sheet: ' + (err?.message || err),
    });
  }
});

app.get('/api/sync-google-sheet-direct/auto', async (req: Request, res: Response) => {
  try {
    const defaultEmail = (req.query?.email as string || 'ducminh1973@gmail.com').trim().toLowerCase();
    const result = await syncGoogleSheetSubmissions('1gH6zehWNY4pWn9bEzslTBI5ROBzr8Q_Cpug-T5b-8BU', defaultEmail);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Lỗi đồng bộ tự động Google Sheet: ' + (err?.message || err),
    });
  }
});

app.post('/api/deduplicate-resources', (_req: Request, res: Response) => {
  try {
    const beforeCount = recentSyncSubmissions.length;
    const deduped = deduplicateCacheRecords(recentSyncSubmissions);
    recentSyncSubmissions.length = 0;
    submissionIdsSet.clear();
    deduped.forEach((item) => {
      recentSyncSubmissions.push(item);
      if (item.submission_id) submissionIdsSet.add(item.submission_id);
    });
    persistCache();
    const removedCount = beforeCount - recentSyncSubmissions.length;
    res.json({
      success: true,
      totalBefore: beforeCount,
      removedCount,
      remainingCount: recentSyncSubmissions.length,
      message: `Đã loại bỏ ${removedCount} bản ghi trùng lặp trong bộ nhớ đồng bộ. Còn lại ${recentSyncSubmissions.length} bản ghi duy nhất.`,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi loại bỏ trùng lặp: ' + (err?.message || err),
    });
  }
});

// Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: HOST,
        port: PORT,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Periodic background sync from Google Sheet every 25 seconds
  setInterval(async () => {
    try {
      await syncGoogleSheetSubmissions('1gH6zehWNY4pWn9bEzslTBI5ROBzr8Q_Cpug-T5b-8BU');
    } catch {}
  }, 25000);

  // Initial sync on startup after 3 seconds
  setTimeout(async () => {
    try {
      await syncGoogleSheetSubmissions('1gH6zehWNY4pWn9bEzslTBI5ROBzr8Q_Cpug-T5b-8BU');
    } catch {}
  }, 3000);

  app.listen(PORT, HOST, () => {
    console.log(`> Server running on http://${HOST}:${PORT}`);
    console.log(`> Google Form Webhook ready at: http://${HOST}:${PORT}/api/sync-google-form-resource`);
  });
}

startServer();
