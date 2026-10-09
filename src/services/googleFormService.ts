import { getSupabaseClient } from '../lib/supabase/client';
import { MockDatabaseStore } from '../lib/supabase/mockStore';
import { realtimeService } from './realtimeService';
import {
  GoogleFormConfig,
  GoogleFormSubmissionPayload,
  GoogleFormSyncStats,
  Profile,
  ResourceSyncLog,
} from '../types';

let activeSyncFromBackendPromise: Promise<number> | null = null;
let lastSyncFromBackendTime = 0;
let lastBackendImportedCount = 0;

let activeSyncFromSheetPromise: Promise<{
  success: boolean;
  totalRows: number;
  syncedCount: number;
  duplicateCount: number;
  skippedCount: number;
  message: string;
  syncedItems?: any[];
}> | null = null;
let lastSyncFromSheetTime = 0;
let lastSyncFromSheetResult: {
  success: boolean;
  totalRows: number;
  syncedCount: number;
  duplicateCount: number;
  skippedCount: number;
  message: string;
  syncedItems?: any[];
} = {
  success: true,
  totalRows: 0,
  syncedCount: 0,
  duplicateCount: 0,
  skippedCount: 0,
  message: 'Đã đồng bộ.',
};

export const googleFormService = {
  /**
   * Get Google Form configuration (centralized URL, state, sheet url, default status)
   */
  async getConfig(callerProfile?: Profile | null): Promise<GoogleFormConfig> {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('system_settings')
          .select('value')
          .eq('key', 'google_form_config')
          .single();

        if (!error && data?.value) {
          return data.value as GoogleFormConfig;
        }
      } catch (err) {
        console.warn('Supabase getGoogleFormConfig fallback:', err);
      }
    }

    return MockDatabaseStore.getInstance().getGoogleFormConfig();
  },

  /**
   * Update Google Form configuration (ADMIN / SCHOOL_ADMIN only)
   */
  async updateConfig(
    updates: Partial<GoogleFormConfig>,
    callerProfile: Profile | null
  ): Promise<GoogleFormConfig> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        const { data, error } = await client
          .from('system_settings')
          .upsert({
            key: 'google_form_config',
            value: updates,
            updated_at: new Date().toISOString(),
            updated_by: callerProfile.id,
          })
          .select('value')
          .single();

        if (!error && data?.value) {
          return data.value as GoogleFormConfig;
        }
      } catch (err) {
        console.warn('Supabase updateGoogleFormConfig fallback:', err);
      }
    }

    return MockDatabaseStore.getInstance().updateGoogleFormConfig(updates, callerProfile);
  },

  /**
   * Get synchronization logs with filter and pagination
   */
  async getSyncLogs(
    callerProfile: Profile | null,
    params: {
      status?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<{ logs: ResourceSyncLog[]; total: number }> {
    const client = getSupabaseClient();
    if (client && callerProfile) {
      try {
        let query = client
          .from('resource_sync_logs')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        if (params.status && params.status !== 'all') {
          query = query.eq('status', params.status);
        }
        if (params.search) {
          query = query.ilike('resource_title', `%${params.search}%`);
        }

        const page = params.page || 1;
        const pageSize = params.pageSize || 10;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, count, error } = await query.range(from, to);
        if (!error && data) {
          return { logs: data as ResourceSyncLog[], total: count || 0 };
        }
      } catch (err) {
        console.warn('Supabase getSyncLogs fallback:', err);
      }
    }

    return MockDatabaseStore.getInstance().getResourceSyncLogs(callerProfile, params);
  },

  /**
   * Get sync statistics (Total, Synced, Duplicate, Failed, Pending)
   */
  async getSyncStats(callerProfile: Profile | null): Promise<GoogleFormSyncStats> {
    return MockDatabaseStore.getInstance().getGoogleFormSyncStats(callerProfile);
  },

  /**
   * Securely sync a submission from Google Form / Apps Script / Webhook
   * Enforces:
   * 1. Idempotency by submission_id
   * 2. Teacher email matching
   * 3. Clean validation & sanitization
   * 4. Status is strictly 'submitted' (or configured default), never 'approved'
   * 5. Creates in-app notifications and activity logs
   */
  async syncSubmission(
    payload: GoogleFormSubmissionPayload,
    syncSecret?: string
  ): Promise<{
    success: boolean;
    status: 'synced' | 'duplicate' | 'failed' | 'invalid';
    message: string;
    resource_id?: string;
    log_id?: string;
  }> {
    const effectiveSecret = syncSecret || 'SECURE_WEBHOOK_SECRET_KEY_2026';
    // 1. Post to Server Webhook Endpoint if available
    try {
      const resp = await fetch('/api/sync-google-form-resource', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': effectiveSecret,
          'Authorization': `Bearer ${effectiveSecret}`,
        },
        body: JSON.stringify(payload),
      });
      if (resp.ok) {
        const json = await resp.json();
        // Also ensure local MockStore has this resource
        MockDatabaseStore.getInstance().syncGoogleFormSubmission(payload, effectiveSecret);
        return json;
      }
    } catch {
      // fallback to client Supabase RPC / MockStore
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.rpc('sync_google_form_resource', {
          p_payload: payload,
          p_secret: effectiveSecret,
        });

        if (!error && data) {
          MockDatabaseStore.getInstance().syncGoogleFormSubmission(payload, effectiveSecret);
          return data;
        }
      } catch (err) {
        console.warn('Supabase syncSubmission RPC fallback:', err);
      }
    }

    return MockDatabaseStore.getInstance().syncGoogleFormSubmission(payload, effectiveSecret);
  },

  /**
   * Test end-to-end sync connection (Section 27)
   */
  async testConnection(secret?: string): Promise<{
    success: boolean;
    results: Record<string, { status: 'PASS' | 'FAIL' | 'WARNING' | 'PENDING'; message: string }>;
    timestamp: string;
  }> {
    try {
      const res = await fetch('/api/sync-google-form-resource/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'X-Webhook-Secret': secret } : {}),
        },
        body: JSON.stringify({ secret }),
      });
      if (res.ok) {
        return await res.json();
      }
      throw new Error(`Server trả về HTTP ${res.status}`);
    } catch (err: any) {
      return {
        success: false,
        results: {
          webhook_endpoint: { status: 'FAIL', message: err.message || 'Không thể kết nối đến Webhook' },
          secret_authentication: { status: 'PENDING', message: 'Chưa thể xác minh do lỗi kết nối' },
          supabase_database: { status: 'PENDING', message: 'Chưa thể kiểm tra cơ sở dữ liệu' },
        },
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * Synchronize submissions received by server webhook into the active client state
   */
  async syncFromBackend(callerProfile: Profile | null, force: boolean = false): Promise<number> {
    if (!callerProfile?.email) return 0;
    const now = Date.now();
    if (!force && now - lastSyncFromBackendTime < 15000) {
      return lastBackendImportedCount;
    }
    if (activeSyncFromBackendPromise) {
      return activeSyncFromBackendPromise;
    }

    activeSyncFromBackendPromise = (async () => {
      try {
        const rawEmail = callerProfile?.email || '';
        const email = encodeURIComponent(rawEmail.trim().toLowerCase());

        // Trigger automatic sheet pull on server
        try {
          await fetch(`/api/sync-google-sheet-direct/auto?email=${email}`);
        } catch {}

        const res = await fetch(`/api/sync-google-form-resource/recent?email=${email}`);
        const store = MockDatabaseStore.getInstance();
        let importedCount = 0;

        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            for (const item of json.data) {
              if (item.sync_status === 'synced' && item.submission_id) {
                // Check if already in store
                const exists = store.getResources(callerProfile, { pageSize: 9999 }).data.some(
                  (r) => r.google_form_submission_id === item.submission_id
                );
                if (!exists) {
                  store.syncGoogleFormSubmission({
                    submission_id: item.submission_id,
                    submitted_at: item.received_at,
                    teacher_email: item.teacher_email,
                    teacher_name: item.teacher_name,
                    title: item.title,
                    description: item.description,
                    department: item.department,
                    subject: item.subject,
                    grade: item.grade,
                    resource_type: item.resource_type,
                    topic: item.topic,
                    academic_year: item.academic_year,
                    resource_url: item.resource_url,
                    drive_file_id: item.drive_file_id,
                  });
                  importedCount++;
                }
              }
            }
          }
        }

        // Also hydrate directly from Supabase Cloud
        const client = getSupabaseClient();
        if (client) {
          try {
            const { data: liveGfResources } = await client
              .from('resources')
              .select(`
                *,
                owner:profiles!resources_owner_id_fkey(id, full_name, email, role),
                department:departments(id, name),
                subject:subjects(id, name, code),
                grade:grades(id, name)
              `)
              .eq('source_type', 'google_form');

            if (liveGfResources && liveGfResources.length > 0) {
              for (const r of liveGfResources) {
                store.syncResourceFromLive(r as any);
              }
            }
          } catch {}
        }

        lastSyncFromBackendTime = Date.now();
        lastBackendImportedCount = importedCount;
        return importedCount;
      } catch {
        return 0;
      } finally {
        activeSyncFromBackendPromise = null;
      }
    })();

    return activeSyncFromBackendPromise;
  },

  /**
   * Retry failed sync
   */
  async retrySyncLog(
    logId: string,
    callerProfile: Profile | null
  ): Promise<{ success: boolean; message: string; resource_id?: string }> {
    return MockDatabaseStore.getInstance().retrySyncLog(logId, callerProfile);
  },

  /**
   * Helper simulator for Admin testing
   */
  async simulateSubmission(
    customPayload: Partial<GoogleFormSubmissionPayload>,
    callerProfile: Profile | null
  ): Promise<{
    success: boolean;
    status: 'synced' | 'duplicate' | 'failed' | 'invalid';
    message: string;
    resource_id?: string;
  }> {
    const randomId = 'sub_sim_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const email = customPayload.teacher_email || callerProfile?.email || 'vuducminh@thcs-nguyendinhanh.edu.vn';
    const name = customPayload.teacher_name || callerProfile?.full_name || 'Vũ Đức Minh';

    const payload: GoogleFormSubmissionPayload = {
      submission_id: customPayload.submission_id || randomId,
      submitted_at: new Date().toISOString(),
      teacher_email: email,
      teacher_name: name,
      title: customPayload.title || 'Giáo án điện tử: Khám phá Vũ trụ và Hệ Mặt Trời',
      description: customPayload.description || 'Học liệu tương tác 3D tích hợp thí nghiệm ảo mô phỏng quỹ đạo các hành tinh.',
      department: customPayload.department || 'Tổ Khoa học tự nhiên',
      subject: customPayload.subject || 'Khoa học tự nhiên',
      grade: customPayload.grade || 'Khối 6',
      resource_type: customPayload.resource_type || 'Bài trình chiếu',
      topic: customPayload.topic || 'Chủ đề: Thiên văn học cơ bản',
      academic_year: customPayload.academic_year || '2026–2027',
      resource_url: customPayload.resource_url || 'https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      drive_file_id: customPayload.drive_file_id || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      keywords: customPayload.keywords || 'vũ trụ, thiên văn, hệ mặt trời, khtn 6',
    };

    return googleFormService.syncSubmission(payload);
  },

  /**
   * Directly synchronize submissions from Google Sheet (CSV export)
   */
  async syncFromGoogleSheet(
    sheetIdOrUrl: string = '1gH6zehWNY4pWn9bEzslTBI5ROBzr8Q_Cpug-T5b-8BU',
    callerProfile?: Profile | null,
    defaultEmail: string = 'ducminh1973@gmail.com',
    force: boolean = false
  ): Promise<{
    success: boolean;
    totalRows: number;
    syncedCount: number;
    duplicateCount: number;
    skippedCount: number;
    message: string;
    syncedItems?: any[];
  }> {
    const now = Date.now();
    if (!force && now - lastSyncFromSheetTime < 15000) {
      return lastSyncFromSheetResult;
    }
    if (activeSyncFromSheetPromise) {
      return activeSyncFromSheetPromise;
    }

    activeSyncFromSheetPromise = (async () => {
      try {
        let cleanSheetId = sheetIdOrUrl.trim();
        const idMatch = cleanSheetId.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (idMatch) {
          cleanSheetId = idMatch[1];
        }

        const email = defaultEmail || callerProfile?.email || 'ducminh1973@gmail.com';
        const store = MockDatabaseStore.getInstance();

        try {
          // 1. First attempt backend endpoint
          const response = await fetch('/api/sync-google-sheet-direct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sheet_id: cleanSheetId, default_email: email }),
          });

          if (response.ok) {
            const json = await response.json();
            if (json.success && Array.isArray(json.synced_items)) {
              // Sync each item into local store
              for (const item of json.synced_items) {
                store.syncGoogleFormSubmission({
                  submission_id: item.submission_id,
                  submitted_at: item.received_at,
                  teacher_email: item.teacher_email,
                  teacher_name: item.teacher_name,
                  title: item.title,
                  description: item.description,
                  department: item.department,
                  subject: item.subject,
                  grade: item.grade,
                  resource_type: item.resource_type,
                  topic: item.topic,
                  academic_year: item.academic_year,
                  resource_url: item.resource_url,
                  drive_file_id: item.drive_file_id,
                });
              }

              const backendRes = {
                success: true,
                totalRows: json.total_rows || 0,
                syncedCount: json.synced_count || 0,
                duplicateCount: json.duplicate_count || 0,
                skippedCount: json.skipped_count || 0,
                message: `Đồng bộ thành công ${json.synced_count} tài nguyên mới (${json.duplicate_count} tài nguyên đã tồn tại trước đó).`,
                syncedItems: json.synced_items,
              };
              lastSyncFromSheetTime = Date.now();
              lastSyncFromSheetResult = backendRes;
              return backendRes;
            }
          }
        } catch (err) {
          console.warn('Backend sync-google-sheet-direct failed, attempting client fallback:', err);
        }

    // 2. Client-side fallback fetch
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${cleanSheetId}/export?format=csv`;
      const res = await fetch(csvUrl);
      if (!res.ok) {
        return {
          success: false,
          totalRows: 0,
          syncedCount: 0,
          duplicateCount: 0,
          skippedCount: 0,
          message: `Không thể kết nối tới Google Sheets (${res.status}). Vui lòng kiểm tra quyền chia sẻ bảng tính.`,
        };
      }

      const csvText = await res.text();
      const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        return {
          success: true,
          totalRows: 0,
          syncedCount: 0,
          duplicateCount: 0,
          skippedCount: 0,
          message: 'Trang tính chưa có dữ liệu phản hồi nào.',
        };
      }

      // Simple header parsing
      const parseCells = (line: string): string[] => {
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
        cells.push(cell.trim());
        return cells;
      };

      const headers = parseCells(lines[0]);
      let syncedCount = 0;
      let duplicateCount = 0;
      let skippedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = parseCells(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });

        const title = (row['Tên tài nguyên'] || row['Tiêu đề'] || row['Tên'] || '').trim();
        if (!title) {
          skippedCount++;
          continue;
        }

        const timestamp = row['Dấu thời gian'] || row['Timestamp'] || '';
        const safeTime = timestamp.replace(/[^0-9]/g, '_') || `row_${i}`;
        const submissionId = `sheet_${cleanSheetId.substring(0, 8)}_r${i}_${safeTime}`;

        const uploadUrl = row['Tải tài liệu lên'] || row['Đường link'] || '';
        let driveFileId: string | undefined;
        const idM = uploadUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) || uploadUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (idM) driveFileId = idM[1];

        const rawGrade = (row['Khối lớp'] || row['Khối'] || '7').trim();
        const grade = rawGrade.startsWith('Khối') ? rawGrade : `Khối ${rawGrade}`;

        const extractedEmail = (row['Địa chỉ email'] || row['Email'] || row['Email giáo viên'] || email).trim().toLowerCase();
        const extractedTeacherName = row['Họ và tên giáo viên'] || row['Họ và tên'] || row['Tên giáo viên'] || 'Vũ Đức Minh';

        const result = store.syncGoogleFormSubmission({
          submission_id: submissionId,
          submitted_at: new Date().toISOString(),
          teacher_email: extractedEmail,
          teacher_name: extractedTeacherName,
          title: title,
          description: row['Mô tả ngắn'] || (row['Lớp cụ thể'] ? `Lớp ${row['Lớp cụ thể']}` : ''),
          department: row['Tổ chuyên môn'] || 'Tổ Khoa học tự nhiên',
          subject: row['Bộ môn'] || 'Tin học',
          grade: grade,
          resource_type: row['Loại tài nguyên'] || 'Học liệu số',
          topic: row['Chủ đề/ Bài học'] || '',
          academic_year: row['Năm học'] || '2026–2027',
          resource_url: uploadUrl || (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : ''),
          drive_file_id: driveFileId,
        });

        if (result.status === 'synced') {
          syncedCount++;
          if (result.resource_id) {
            const syncedRes = store.getResourceById(result.resource_id, callerProfile || null);
            if (syncedRes) {
              realtimeService.broadcastLocalChange('resources', 'INSERT', syncedRes);
            }
          }
        } else if (result.status === 'duplicate') duplicateCount++;
        else skippedCount++;
      }

          const fallbackSuccess = {
            success: true,
            totalRows: lines.length - 1,
            syncedCount,
            duplicateCount,
            skippedCount,
            message: `Đồng bộ hoàn tất: ${syncedCount} mới, ${duplicateCount} trùng lặp, ${skippedCount} bỏ qua.`,
          };
          lastSyncFromSheetTime = Date.now();
          lastSyncFromSheetResult = fallbackSuccess;
          return fallbackSuccess;
        } catch (fallbackErr: any) {
          const fallbackFail = {
            success: false,
            totalRows: 0,
            syncedCount: 0,
            duplicateCount: 0,
            skippedCount: 0,
            message: 'Lỗi đồng bộ bảng tính: ' + (fallbackErr?.message || fallbackErr),
          };
          lastSyncFromSheetTime = Date.now();
          lastSyncFromSheetResult = fallbackFail;
          return fallbackFail;
        }
      } finally {
        activeSyncFromSheetPromise = null;
      }
    })();

    return activeSyncFromSheetPromise;
  },
};
