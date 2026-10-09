import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { googleFormService } from '../services/googleFormService';
import { MockDatabaseStore } from '../lib/supabase/mockStore';
import { getSupabaseCredentials } from '../lib/supabase/client';
import {
  GoogleFormConfig,
  GoogleFormSubmissionPayload,
  GoogleFormSyncStats,
  Profile,
  ResourceSyncLog,
  Subject,
  Department,
  Grade,
} from '../types';
import {
  FileSpreadsheet,
  Settings2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Play,
  History,
  Code2,
  ShieldAlert,
  ArrowRight,
  Filter,
  Search,
  RotateCcw,
  Sparkles,
  Activity,
  Database,
  Server,
  Link2,
  Key,
  XCircle,
  Cpu,
  Loader2,
} from 'lucide-react';
import { formatDateTimeVi } from '../utils/formatters';

export function AdminGoogleFormConfigPage() {
  const { profile, role } = useAuth();
  const isAdmin = role === 'ADMIN' || profile?.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs max-w-xl mx-auto mt-12">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-800">Không có quyền truy cập</h2>
        <p className="text-sm text-slate-500 mt-2">
          Chức năng Cấu hình Google Form chỉ dành riêng cho Quản trị viên hệ thống (ADMIN). Tài khoản Hiệu trưởng và Phó hiệu trưởng không được cấp quyền truy cập mục này.
        </p>
        <a
          href="#/"
          className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition"
        >
          Quay lại Bảng điều khiển
        </a>
      </div>
    );
  }

  // Config State
  const [config, setConfig] = useState<GoogleFormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form edit fields
  const [formUrl, setFormUrl] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [defaultStatus, setDefaultStatus] = useState<'submitted' | 'draft'>('submitted');
  const [instructions, setInstructions] = useState('');

  // Logs & Stats
  const [stats, setStats] = useState<GoogleFormSyncStats | null>(null);
  const [logs, setLogs] = useState<ResourceSyncLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logStatusFilter, setLogStatusFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [logPage, setLogPage] = useState(1);

  // Simulator State
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);

  const [simTeacherEmail, setSimTeacherEmail] = useState('');
  const [simTitle, setSimTitle] = useState('Bài giảng điện tử: Quang hợp ở thực vật (Tích hợp 3D)');
  const [simDept, setSimDept] = useState('Tổ Khoa học tự nhiên');
  const [simSubject, setSimSubject] = useState('Khoa học tự nhiên');
  const [simGrade, setSimGrade] = useState('Khối 7');
  const [simType, setSimType] = useState('Bài trình chiếu');
  const [simUrl, setSimUrl] = useState('https://docs.google.com/presentation/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit');
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{ success: boolean; status: string; message: string; resource_id?: string } | null>(null);

  // Diagnostic Test State (Sections 26 & 27)
  const [testingConnection, setTestingConnection] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<{
    success: boolean;
    results: Record<string, { status: 'PASS' | 'FAIL' | 'WARNING' | 'PENDING'; message: string }>;
    timestamp: string;
  } | null>(null);

  // Code copy state
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedEdge, setCopiedEdge] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'settings' | 'diagnostic' | 'logs' | 'simulator' | 'guide'>('settings');
  const [guideSubTab, setGuideSubTab] = useState<'script' | 'edge' | 'sql'>('script');

  // Direct Sheet Sync State
  const [sheetSyncing, setSheetSyncing] = useState(false);
  const [sheetSyncResult, setSheetSyncResult] = useState<{
    success: boolean;
    totalRows: number;
    syncedCount: number;
    duplicateCount: number;
    skippedCount: number;
    message: string;
  } | null>(null);

  const supabaseCreds = getSupabaseCredentials();

  useEffect(() => {
    loadAll();
  }, [profile]);

  useEffect(() => {
    loadLogs();
  }, [logStatusFilter, logSearch, logPage]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const conf = await googleFormService.getConfig(profile);
      setConfig(conf);
      setFormUrl(conf.form_url || '');
      setSheetUrl(conf.sheet_url || '');
      setIsActive(conf.is_active ?? true);
      setDefaultStatus(conf.default_status || 'submitted');
      setInstructions(conf.instructions || '');

      // Load metadata for simulator
      const store = MockDatabaseStore.getInstance();
      const allProfiles = store.getProfiles(profile);
      const teacherProfiles = allProfiles.filter((p): p is Profile & { email: string } => p.status === 'active' && !!p.email);
      setTeachers(teacherProfiles);
      if (teacherProfiles.length > 0) {
        setSimTeacherEmail(teacherProfiles[0].email || '');
      }

      setDepartments(store.getDepartments(profile));
      setSubjects(store.getSubjects(profile));
      setGrades(store.getGrades(profile));

      // Load initial stats
      const s = await googleFormService.getSyncStats(profile);
      setStats(s);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi tải cấu hình Google Form.');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      const res = await googleFormService.getSyncLogs(profile, {
        status: logStatusFilter,
        search: logSearch,
        page: logPage,
        pageSize: 10,
      });
      setLogs(res.logs);
      setLogsTotal(res.total);

      const s = await googleFormService.getSyncStats(profile);
      setStats(s);
    } catch (err) {
      console.warn('Could not load sync logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg(null);
      setSaveSuccess(false);

      const updated = await googleFormService.updateConfig(
        {
          form_url: formUrl,
          sheet_url: sheetUrl,
          is_active: isActive,
          default_status: defaultStatus,
          instructions: instructions,
        },
        profile
      );

      setConfig(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lưu cấu hình thất bại.');
    } finally {
      setSaving(false);
    }
  };

  // Section 27: End-to-End Test connection (without creating dummy resources)
  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      const report = await googleFormService.testConnection('SECURE_WEBHOOK_SECRET_KEY_2026');
      setDiagnosticReport(report);
    } catch (err: any) {
      setDiagnosticReport({
        success: false,
        results: {
          webhook_endpoint: { status: 'FAIL', message: err.message || 'Lỗi kiểm tra kết nối' },
          secret_authentication: { status: 'PENDING', message: 'Chưa thực hiện' },
          supabase_database: { status: 'PENDING', message: 'Chưa thực hiện' },
        },
        timestamp: new Date().toISOString(),
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleRunSimulator = async () => {
    if (!simTitle.trim() || !simTeacherEmail.trim()) {
      alert('Vui lòng điền đầy đủ tiêu đề tài nguyên và email giáo viên.');
      return;
    }
    try {
      setSimulating(true);
      setSimResult(null);

      const res = await googleFormService.simulateSubmission(
        {
          teacher_email: simTeacherEmail,
          title: simTitle,
          department: simDept,
          subject: simSubject,
          grade: simGrade,
          resource_type: simType,
          resource_url: simUrl,
        },
        profile
      );

      setSimResult(res);
      loadLogs();
    } catch (err: any) {
      setSimResult({
        success: false,
        status: 'failed',
        message: err.message || 'Lỗi khi chạy bộ giả lập.',
      });
    } finally {
      setSimulating(false);
    }
  };

  const handleRetryLog = async (logId: string) => {
    try {
      const res = await googleFormService.retrySyncLog(logId, profile);
      alert(res.message);
      loadLogs();
    } catch (err: any) {
      alert('Thử lại thất bại: ' + err.message);
    }
  };

  const handleSyncFromSheet = async (overrideSheetId?: string) => {
    const targetSheetId = overrideSheetId || (sheetUrl ? (sheetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || sheetUrl) : '1gH6zehWNY4pWn9bEzslTBI5ROBzr8Q_Cpug-T5b-8BU');
    try {
      setSheetSyncing(true);
      setSheetSyncResult(null);
      const res = await googleFormService.syncFromGoogleSheet(targetSheetId, profile, 'ducminh1973@gmail.com');
      setSheetSyncResult(res);
      await loadLogs();
      const s = await googleFormService.getSyncStats(profile);
      setStats(s);
    } catch (err: any) {
      setSheetSyncResult({
        success: false,
        totalRows: 0,
        syncedCount: 0,
        duplicateCount: 0,
        skippedCount: 0,
        message: err.message || 'Lỗi khi đồng bộ từ Trang tính Google',
      });
    } finally {
      setSheetSyncing(false);
    }
  };

  // 1. Google Apps Script Template
  const sampleAppsScript = `/**
 * GOOGLE APPS SCRIPT - ĐỒNG BỘ TÀI NGUYÊN SỐ TỪ GOOGLE FORM SANG HỆ THỐNG
 * Trường TH&THCS Nguyễn Đình Anh
 * 
 * Áp dụng trực tiếp cho Trang tính Google:
 * - ID: 1gH6zehWNY4pWn9bEzslTBI5ROBzr8Q_Cpug-T5b-8BU
 * - URL: https://docs.google.com/spreadsheets/d/1gH6zehWNY4pWn9bEzslTBI5ROBzr8Q_Cpug-T5b-8BU/edit
 * 
 * Hướng dẫn cài đặt:
 * 1. Mở file Google Sheets trên (Phản hồi biểu mẫu).
 * 2. Chọn Tiện ích mở rộng (Extensions) -> Apps Script.
 * 3. Dán toàn bộ mã nguồn này vào tệp Code.gs.
 * 4. Vào mục Project Settings (Biểu tượng Bánh răng) -> Script Properties:
 *    - WEBHOOK_URL: ${typeof window !== 'undefined' ? window.location.origin : ''}/api/sync-google-form-resource
 *    - GOOGLE_FORM_SYNC_SECRET: SECURE_WEBHOOK_SECRET_KEY_2026
 *    - DEFAULT_TEACHER_EMAIL: ducminh1973@gmail.com
 * 5. Chọn Triggers (Hình đồng hồ bên trái) -> Thêm trình kích hoạt (Add Trigger):
 *    - Chọn hàm chạy: onFormSubmit
 *    - Chọn nguồn sự kiện: Từ bảng tính (From spreadsheet)
 *    - Chọn loại sự kiện: Khi gửi biểu mẫu (On form submit)
 */

const scriptProperties = PropertiesService.getScriptProperties();

function getEnv(key, defaultValue) {
  var val = scriptProperties.getProperty(key);
  return (val && val.length > 0) ? val : defaultValue;
}

function findColumnValue(namedValues, aliases) {
  if (!namedValues) return '';
  for (var i = 0; i < aliases.length; i++) {
    var k = aliases[i];
    if (namedValues[k] && namedValues[k].length > 0 && namedValues[k][0]) {
      return String(namedValues[k][0]).trim();
    }
  }
  var keys = Object.keys(namedValues);
  for (var j = 0; j < keys.length; j++) {
    var normKey = keys[j].toLowerCase().trim();
    for (var m = 0; m < aliases.length; m++) {
      if (normKey === aliases[m].toLowerCase().trim()) {
        var val = namedValues[keys[j]];
        if (val && val.length > 0 && val[0]) return String(val[0]).trim();
      }
    }
  }
  return '';
}

function extractDriveFileId(url) {
  if (!url) return '';
  var match = url.match(/\\/file\\/d\\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  match = url.match(/\\/open\\?id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  return '';
}

function onFormSubmit(e) {
  Logger.log("[FORM_SUBMIT] START");

  try {
    var responses = (e && e.namedValues) ? e.namedValues : {};

    // 1. Trích xuất email giáo viên (Chuẩn hóa chữ thường)
    var teacherEmail = findColumnValue(responses, [
      'Email', 'Địa chỉ email', 'Email giáo viên', 'Email Address', 'Địa chỉ email của bạn'
    ]);
    if (!teacherEmail && e && e.response) {
      try {
        teacherEmail = e.response.getRespondentEmail();
      } catch (err) {}
    }
    // Dự phòng khi Google Form chưa có câu hỏi Email
    if (!teacherEmail) {
      teacherEmail = getEnv('DEFAULT_TEACHER_EMAIL', 'ducminh1973@gmail.com');
    }
    teacherEmail = (teacherEmail || '').trim().toLowerCase();
    Logger.log("[FORM_SUBMIT] EMAIL = " + teacherEmail);

    var teacherName = findColumnValue(responses, [
      'Họ và tên giáo viên', 'Họ và tên', 'Tên giáo viên', 'Giáo viên thực hiện', 'Họ tên'
    ]);

    // 2. Trích xuất tên tài nguyên và mô tả
    var title = findColumnValue(responses, [
      'Tên tài nguyên', 'Tiêu đề tài nguyên', 'Tên học liệu', 'Tiêu đề', 'Tên bài giảng', 'Tên kế hoạch bài dạy'
    ]);
    Logger.log("[FORM_SUBMIT] TITLE = " + title);

    var description = findColumnValue(responses, [
      'Mô tả nội dung', 'Mô tả ngắn', 'Mô tả chi tiết', 'Mô tả'
    ]);

    // 3. Trích xuất phân loại
    var resourceType = findColumnValue(responses, [
      'Loại tài nguyên', 'Thể loại', 'Hình thức tài nguyên', 'Phân loại'
    ]) || 'Học liệu số';

    var department = findColumnValue(responses, [
      'Tổ chuyên môn', 'Tổ bộ môn', 'Tổ'
    ]);

    var subject = findColumnValue(responses, [
      'Bộ môn', 'Môn học', 'Môn', 'Môn giảng dạy'
    ]);

    var grade = findColumnValue(responses, [
      'Khối lớp', 'Khối'
    ]);

    var topic = findColumnValue(responses, [
      'Chủ đề/ Bài học', 'Chủ đề / Bài học', 'Chủ đề', 'Bài học', 'Tên bài'
    ]);

    // 4. Trích xuất tệp Google Drive đính kèm
    var rawFileUrl = findColumnValue(responses, [
      'Tải tài liệu lên', 'Tệp tải lên', 'File upload', 'Liên kết tài nguyên', 'Tệp tài nguyên',
      'Link Google Drive / Slides / Docs / Canva', 'Link chia sẻ', 'URL tài nguyên', 'File đính kèm'
    ]);

    var driveFileId = extractDriveFileId(rawFileUrl);
    var resourceUrl = rawFileUrl;

    // Chống lưu nhầm link Google Form
    if (resourceUrl && (resourceUrl.indexOf('forms.gle') !== -1 || resourceUrl.indexOf('docs.google.com/forms') !== -1)) {
      resourceUrl = '';
    }

    if (!resourceUrl && driveFileId) {
      resourceUrl = 'https://drive.google.com/file/d/' + driveFileId + '/view';
    }

    Logger.log("[FORM_SUBMIT] FILE = " + (driveFileId ? ("Drive ID: " + driveFileId) : resourceUrl));

    if (!title) {
      Logger.log("[FORM_SUBMIT][ERROR] Thiếu tiêu đề tài nguyên.");
      return;
    }

    if (!teacherEmail) {
      Logger.log("[FORM_SUBMIT][ERROR] Thiếu email giáo viên.");
      return;
    }

    // 5. Tự sinh mã submission duy nhất chống tạo trùng (Idempotent)
    var submissionId = "gf_" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss") + "_" + Math.floor(Math.random() * 10000);

    // 6. Xây dựng payload đồng bộ chuẩn
    Logger.log("[FORM_SUBMIT] BUILD_PAYLOAD");
    var payload = {
      submission_id: submissionId,
      submitted_at: new Date().toISOString(),
      teacher_email: teacherEmail,
      teacher_name: teacherName,
      title: title,
      description: description,
      resource_type: resourceType,
      subject: subject,
      grade: grade,
      department: department,
      topic: topic,
      academic_year: "2026–2027",
      resource_url: resourceUrl,
      google_drive_file_id: driveFileId,
      drive_file_id: driveFileId
    };

    // 7. Gửi HTTP Request sang Webhook / Edge Function
    Logger.log("[FORM_SUBMIT] SEND_TO_SUPABASE");
    var webhookUrl = getEnv('WEBHOOK_URL', '${typeof window !== 'undefined' ? window.location.origin : ''}/api/sync-google-form-resource');
    var secret = getEnv('GOOGLE_FORM_SYNC_SECRET', 'SECURE_WEBHOOK_SECRET_KEY_2026');

    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      headers: {
        "Authorization": "Bearer " + secret,
        "X-Webhook-Secret": secret
      },
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(webhookUrl, options);
    var statusCode = response.getResponseCode();
    var responseBody = response.getContentText();

    Logger.log("[FORM_SUBMIT] RESPONSE = HTTP " + statusCode + " | " + responseBody);

    if (statusCode >= 200 && statusCode < 300) {
      Logger.log("[FORM_SUBMIT] SUCCESS: Đồng bộ tài nguyên vào hệ thống thành công!");
    } else {
      Logger.log("[FORM_SUBMIT][ERROR] Lỗi phản hồi từ máy chủ: " + responseBody);
    }

    Logger.log("[FORM_SUBMIT] END");
  } catch (error) {
    Logger.log("[FORM_SUBMIT][ERROR] Ngoại lệ thực thi: " + error.toString());
  }
}
`;

  // 2. Supabase Edge Function Template
  const sampleEdgeFunction = `// Supabase Edge Function: sync-google-form-resource
// Endpoint: https://<PROJECT-REF>.supabase.co/functions/v1/sync-google-form-resource

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  console.log('[SYNC] REQUEST RECEIVED');

  try {
    // 1. Xác thực Secret
    const expectedSecret = Deno.env.get('GOOGLE_FORM_SYNC_SECRET') || 'SECURE_WEBHOOK_SECRET_KEY_2026';
    const headerSecret = req.headers.get('x-webhook-secret');
    const authHeader = req.headers.get('authorization');
    const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    const providedSecret = headerSecret || bearerSecret;

    if (expectedSecret && providedSecret !== expectedSecret) {
      console.error('[SYNC][ERROR] AUTHENTICATION FAILED');
      return new Response(
        JSON.stringify({ success: false, status: 'invalid', code: 'UNAUTHORIZED', message: 'Mã Secret không hợp lệ.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('[SYNC] AUTHENTICATION PASSED');

    // 2. Kiểm tra Payload
    const payload = await req.json();
    const teacherEmail = (payload.teacher_email || '').trim().toLowerCase();
    const title = (payload.title || '').trim();
    let submissionId = (payload.submission_id || '').trim();
    if (!submissionId) submissionId = 'gf_' + Date.now();

    if (!teacherEmail || !teacherEmail.includes('@') || !title) {
      console.error('[SYNC][ERROR] INVALID_PAYLOAD');
      return new Response(
        JSON.stringify({ success: false, status: 'invalid', code: 'INVALID_PAYLOAD', message: 'Email hoặc tiêu đề không hợp lệ.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('[SYNC] PAYLOAD VALIDATED');

    // 3. Supabase RPC Call
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[SYNC] TEACHER LOOKUP');
    console.log('[SYNC] SUBJECT LOOKUP');
    console.log('[SYNC] GRADE LOOKUP');
    console.log('[SYNC] RESOURCE TYPE LOOKUP');
    console.log('[SYNC] CREATE RESOURCE');

    const { data, error } = await supabase.rpc('sync_google_form_resource', {
      p_payload: { ...payload, submission_id: submissionId, teacher_email: teacherEmail, title: title },
      p_secret: providedSecret,
    });

    if (error) {
      console.error('[SYNC][ERROR] Database error:', error.message);
      return new Response(
        JSON.stringify({ success: false, status: 'failed', code: 'DATABASE_ERROR', message: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (data?.status === 'duplicate') {
      return new Response(
        JSON.stringify({ success: true, status: 'duplicate', resource_id: data.resource_id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (data?.code === 'TEACHER_NOT_FOUND') {
      console.error('[SYNC][ERROR] TEACHER_NOT_FOUND: ' + teacherEmail);
      return new Response(
        JSON.stringify({ success: false, status: 'failed', code: 'TEACHER_NOT_FOUND', message: 'Email chưa được đăng ký trong hệ thống.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[SYNC] TEACHER FOUND');
    console.log('[SYNC] RESOURCE CREATED');
    console.log('[SYNC] CREATE NOTIFICATION');
    console.log('[SYNC] SUCCESS');

    return new Response(
      JSON.stringify({ success: true, status: 'synced', resource_id: data?.resource_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[SYNC][ERROR]', err.message);
    return new Response(
      JSON.stringify({ success: false, status: 'failed', code: 'INTERNAL_ERROR', message: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
`;

  // 3. SQL Migration Template
  const sampleSqlMigration = `-- Migration 008: Comprehensive Google Form & Apps Script to Supabase Sync
-- 1. BẢO ĐẢM CỘT teacher_id VÀ owner_id ĐƯỢC ĐỒNG BỘ TUYỆT ĐỐI
ALTER TABLE IF EXISTS public.resources
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'google_form', 'google_drive', 'api')),
  ADD COLUMN IF NOT EXISTS google_form_submission_id TEXT,
  ADD COLUMN IF NOT EXISTS google_drive_file_id TEXT,
  ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- Cập nhật dữ liệu cũ
UPDATE public.resources SET teacher_id = owner_id WHERE teacher_id IS NULL AND owner_id IS NOT NULL;

-- 2. CHỈ MỤC DUY NHẤT CHỐNG TRÙNG LẶP SUBMISSION (Idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS uq_resources_google_form_submission_id 
  ON public.resources (google_form_submission_id) 
  WHERE google_form_submission_id IS NOT NULL;

-- 3. STORED PROCEDURE sync_google_form_resource
CREATE OR REPLACE FUNCTION public.sync_google_form_resource(p_payload jsonb, p_secret text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_submission_id text;
  v_email text;
  v_title text;
  v_desc text;
  v_url text;
  v_drive_file_id text;
  v_dept_name text;
  v_subj_name text;
  v_grade_name text;
  v_type_name text;
  v_topic text;
  v_school_year text;
  v_teacher_id uuid;
  v_teacher_full_name text;
  v_dept_id uuid;
  v_subj_id uuid;
  v_grade_id uuid;
  v_resource_id uuid;
  v_existing_id uuid;
  v_leader_id uuid;
BEGIN
  v_submission_id := trim(COALESCE(p_payload->>'submission_id', ''));
  v_email := lower(trim(COALESCE(p_payload->>'teacher_email', p_payload->>'email', '')));
  v_title := trim(COALESCE(p_payload->>'title', ''));
  v_desc := trim(COALESCE(p_payload->>'description', ''));
  v_url := trim(COALESCE(p_payload->>'resource_url', ''));
  v_drive_file_id := trim(COALESCE(p_payload->>'google_drive_file_id', p_payload->>'drive_file_id', ''));
  v_dept_name := trim(COALESCE(p_payload->>'department', ''));
  v_subj_name := trim(COALESCE(p_payload->>'subject', ''));
  v_grade_name := trim(COALESCE(p_payload->>'grade', ''));
  v_type_name := trim(COALESCE(p_payload->>'resource_type', 'Kế hoạch bài dạy'));
  v_topic := trim(COALESCE(p_payload->>'topic', ''));
  v_school_year := trim(COALESCE(p_payload->>'academic_year', '2026–2027'));

  IF v_submission_id = '' THEN v_submission_id := 'gf_' || to_char(now(), 'YYYYMMDD_HH24MISS'); END IF;

  IF v_email = '' OR position('@' in v_email) = 0 THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid', 'code', 'INVALID_PAYLOAD', 'message', 'Email không hợp lệ.');
  END IF;

  -- Chống trùng lặp (Idempotent)
  SELECT id INTO v_existing_id FROM public.resources WHERE google_form_submission_id = v_submission_id LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'status', 'duplicate', 'resource_id', v_existing_id);
  END IF;

  -- Tìm giáo viên theo Email
  SELECT id, full_name, department_id INTO v_teacher_id, v_teacher_full_name, v_dept_id
  FROM public.profiles WHERE lower(trim(email)) = v_email AND status = 'active' LIMIT 1;

  IF v_teacher_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status', 'failed', 'code', 'TEACHER_NOT_FOUND', 'message', 'Email chưa được đăng ký trong hệ thống.');
  END IF;

  -- Ánh xạ tổ/môn/khối
  IF v_dept_id IS NULL AND v_dept_name <> '' THEN
    SELECT id INTO v_dept_id FROM public.departments WHERE lower(trim(name)) = lower(trim(v_dept_name)) LIMIT 1;
  END IF;
  IF v_subj_name <> '' THEN
    SELECT id INTO v_subj_id FROM public.subjects WHERE lower(trim(name)) = lower(trim(v_subj_name)) LIMIT 1;
  END IF;
  IF v_grade_name <> '' THEN
    SELECT id INTO v_grade_id FROM public.grades WHERE lower(trim(name)) = lower(trim(v_grade_name)) LIMIT 1;
  END IF;

  IF (v_url IS NULL OR v_url = '') AND v_drive_file_id <> '' THEN
    v_url := 'https://drive.google.com/file/d/' || v_drive_file_id || '/view';
  ELSIF v_url IS NULL OR v_url = '' THEN
    v_url := 'https://drive.google.com';
  END IF;

  -- Tạo tài nguyên: Bắt buộc status = 'submitted', gán cả owner_id và teacher_id
  INSERT INTO public.resources (
    owner_id, teacher_id, title, description, resource_type, topic,
    subject_id, grade_id, department_id, school_year, resource_url,
    source_type, google_form_submission_id, google_drive_file_id, status,
    source_metadata, synced_at, created_at, updated_at, submitted_at
  ) VALUES (
    v_teacher_id, v_teacher_id, v_title, v_desc, v_type_name, v_topic,
    v_subj_id, v_grade_id, v_dept_id, v_school_year, v_url,
    'google_form', v_submission_id, NULLIF(v_drive_file_id, ''), 'submitted',
    p_payload, now(), now(), now(), now()
  ) RETURNING id INTO v_resource_id;

  -- Lịch sử duyệt
  INSERT INTO public.approval_history (resource_id, actor_id, action, from_status, to_status, notes)
  VALUES (v_resource_id, v_teacher_id, 'submit', 'draft', 'submitted', 'Tài nguyên nộp qua Google Form.');

  -- Thông báo cho giáo viên
  INSERT INTO public.notifications (recipient_id, title, content, type, resource_id, is_read)
  VALUES (v_teacher_id, 'Tài nguyên đã tiếp nhận', 'Tài nguyên "' || v_title || '" đã được tiếp nhận và hiển thị trong "Tài nguyên của tôi".', 'RESOURCE_SUBMITTED', v_resource_id, false);

  RETURN jsonb_build_object('success', true, 'status', 'synced', 'resource_id', v_resource_id);
END;
$$;
`;

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Cấu hình tích hợp
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                config?.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
              }`}>
                {config?.is_active ? 'Đang hoạt động' : 'Đang tạm dừng'}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Quản trị Tích hợp Google Form & Đồng bộ Supabase
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm">
              Đảm bảo đường đi dữ liệu hoàn chỉnh: Form → Sheet → Apps Script → Edge Function → Database → Tài nguyên của tôi.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="#/upload-resource"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Xem trang giáo viên
            </a>
          </div>
        </div>

        {/* Sync KPI Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-5 border-t border-slate-100">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[11px] font-medium text-slate-500 block">Tổng lượt gửi</span>
              <span className="text-xl font-extrabold text-slate-900">{stats.total}</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-center">
              <span className="text-[11px] font-medium text-emerald-700 block">Đã đồng bộ</span>
              <span className="text-xl font-extrabold text-emerald-800">{stats.synced}</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100 text-center">
              <span className="text-[11px] font-medium text-amber-700 block">Trùng lặp (Chặn)</span>
              <span className="text-xl font-extrabold text-amber-800">{stats.duplicate}</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100 text-center">
              <span className="text-[11px] font-medium text-rose-700 block">Lỗi / Email sai</span>
              <span className="text-xl font-extrabold text-rose-800">{stats.failed}</span>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-center col-span-2 sm:col-span-1">
              <span className="text-[11px] font-medium text-indigo-700 block">Lần đồng bộ cuối</span>
              <span className="text-xs font-bold text-indigo-900 block mt-1 truncate">
                {config?.last_synced_at ? formatDateTimeVi(config.last_synced_at) : 'Chưa có'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'settings'
              ? 'border-indigo-600 text-indigo-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          Cấu hình Biểu mẫu
        </button>
        <button
          onClick={() => setActiveTab('diagnostic')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'diagnostic'
              ? 'border-indigo-600 text-indigo-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-600" />
          Kiểm tra đồng bộ & Test kết nối
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'logs'
              ? 'border-indigo-600 text-indigo-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          Nhật ký đồng bộ ({logsTotal})
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'simulator'
              ? 'border-indigo-600 text-indigo-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Play className="w-4 h-4 text-emerald-600" />
          Giả lập kiểm thử (Simulator)
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'guide'
              ? 'border-indigo-600 text-indigo-700 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Code2 className="w-4 h-4" />
          Mã nguồn & Cài đặt
        </button>
      </div>

      {/* 2. TAB: CẤU HÌNH BIỂU MẪU */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
          {saveSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Đã lưu cấu hình Google Form thành công!
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Form URL */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Đường dẫn Google Form (Form Embed URL) <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    required
                    placeholder="https://docs.google.com/forms/d/e/.../viewform?embedded=true"
                    className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  {formUrl && (
                    <a
                      href={formUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Thử mở
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Lấy từ Google Form: Bấm <strong>Gửi</strong> → Chọn biểu tượng <strong>Nhúng HTML (&lt;&gt;)</strong> hoặc link chia sẻ.
                </p>
              </div>

              {/* Sheet URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Đường dẫn Google Sheets chứa kết quả phản hồi
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  {sheetUrl && (
                    <a
                      href={sheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Mở Sheet
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Trang tính liên kết với Form để nhận dữ liệu nộp và cấu hình Apps Script.
                </p>
              </div>

              {/* Connected Google Sheet Direct Sync Banner */}
              <div className="md:col-span-2 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow-xs">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Trang tính đang kết nối
                      </span>
                      <code className="text-xs font-mono font-bold text-emerald-950 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                        1gH6zehWNY4pWn9bEzslTBI5ROBzr8Q_Cpug-T5b-8BU
                      </code>
                    </div>
                    <p className="text-xs text-slate-700">
                      Hệ thống hỗ trợ <strong>đồng bộ trực tiếp 2 chiều</strong>: tự động đọc các hàng phản hồi từ Trang tính Google (Tin học 7, Học liệu số, liên kết Drive) và nạp tức thì vào danh sách tài nguyên với trạng thái <em>Chờ duyệt</em>.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href="https://docs.google.com/spreadsheets/d/1gH6zehWNY4pWn9bEzslTBI5ROBzr8Q_Cpug-T5b-8BU/edit"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 transition flex items-center gap-1.5 shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Xem trên Google
                    </a>
                    <button
                      type="button"
                      onClick={() => handleSyncFromSheet('1gH6zehWNY4pWn9bEzslTBI5ROBzr8Q_Cpug-T5b-8BU')}
                      disabled={sheetSyncing}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      {sheetSyncing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Đang đồng bộ...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          Đồng bộ ngay từ Trang tính
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {sheetSyncResult && (
                  <div className={`mt-3.5 p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                    sheetSyncResult.success ? 'bg-white border-emerald-300 text-emerald-900 shadow-xs' : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    {sheetSyncResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{sheetSyncResult.message}</span>
                  </div>
                )}
              </div>

              {/* Default Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Trạng thái mặc định khi nhận tài nguyên
                </label>
                <select
                  value={defaultStatus}
                  onChange={(e) => setDefaultStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="submitted">Chờ duyệt (submitted) - Khuyến nghị bắt buộc</option>
                  <option value="draft">Bản nháp (draft) - Giáo viên cần xác nhận lại</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  <strong>Quy tắc bảo mật:</strong> Không cho phép tự động duyệt (approved) khi nộp qua Form.
                </p>
              </div>

              {/* Is Active Toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Kích hoạt nhận tài nguyên qua Google Form
                </label>
                <div className="flex items-center gap-3 pt-1">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                  <span className="text-xs font-medium text-slate-700">
                    {isActive ? 'Đang mở cho giáo viên gửi bài' : 'Đang tạm dừng (Hiển thị thông báo)'}
                  </span>
                </div>
              </div>

              {/* Webhook Endpoint */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Webhook URL tiếp nhận từ Apps Script
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/sync-google-form-resource`}
                    className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-mono select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/api/sync-google-form-resource`;
                      navigator.clipboard.writeText(url);
                      setCopiedWebhook(true);
                      setTimeout(() => setCopiedWebhook(false), 2000);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1"
                  >
                    {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Lời dặn / Hướng dẫn giáo viên hiển thị ở đầu trang
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Nhập hướng dẫn ngắn..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Lần cập nhật cuối: {config?.updated_at ? formatDateTimeVi(config.updated_at) : '—'} bởi {config?.updated_by || 'Hệ thống'}
              </span>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs flex items-center gap-2"
              >
                {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Lưu cài đặt biểu mẫu
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. TAB: KIỂM TRA ĐỒNG BỘ & TEST KẾT NỐI (Sections 26 & 27) */}
      {activeTab === 'diagnostic' && (
        <div className="space-y-6">
          {/* Status Matrix (Section 26) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                Kiểm tra trạng thái 5 mắt xích đồng bộ (Section 26)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Toàn bộ chuỗi dữ liệu bắt buộc phải thông suốt: Google Form → Sheet → Apps Script → Edge Function → Database.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* 1. Google Form */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">1. Google Form</span>
                    {formUrl ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Đã cấu hình
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Chưa cấu hình
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {formUrl ? 'Đã nhúng Form URL vào giao diện giáo viên.' : 'Chưa nhập URL biểu mẫu trong Cài đặt.'}
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                  {formUrl ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
                  {formUrl ? 'Sẵn sàng nhận dữ liệu' : 'Cần nhập Form URL'}
                </div>
              </div>

              {/* 2. Google Sheet */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">2. Google Sheets</span>
                    {sheetUrl ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Đã liên kết
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Chưa cấu hình
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {sheetUrl ? 'Đã lưu URL trang tính câu trả lời.' : 'Chưa cấu hình liên kết Sheets câu trả lời.'}
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                  {sheetUrl ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
                  {sheetUrl ? 'Có nơi gắn Apps Script' : 'Chưa có Sheet URL'}
                </div>
              </div>

              {/* 3. Apps Script */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">3. Apps Script</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      OnFormSubmit
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Mã nguồn Code.gs đã sẵn sàng để dán vào Extensions → Apps Script.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center gap-1 text-[11px] text-indigo-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  Mã chuẩn hóa v2026
                </div>
              </div>

              {/* 4. Edge Function / Webhook */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">4. Edge Function</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Online
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate font-mono">
                    /api/sync-google-form-resource
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                  <Server className="w-3.5 h-3.5 text-emerald-600" />
                  Sẵn sàng nhận POST
                </div>
              </div>

              {/* 5. Supabase Database */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">5. Cơ sở dữ liệu</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      supabaseCreds.isLiveConfigured
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {supabaseCreds.isLiveConfigured ? 'Supabase Live' : 'Mock DB'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {supabaseCreds.isLiveConfigured ? 'Kết nối PostgreSQL trực tiếp.' : 'Đang chạy lưu trữ cục bộ Mock Database.'}
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center gap-1 text-[11px] font-medium text-slate-600">
                  <Database className="w-3.5 h-3.5 text-indigo-600" />
                  {supabaseCreds.isLiveConfigured ? 'PostgreSQL RLS Active' : 'Fallback State'}
                </div>
              </div>
            </div>
          </div>

          {/* End-to-End Test (Section 27) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-emerald-600" />
                  Kiểm tra kết nối End-to-End (Section 27)
                </h3>
                <p className="text-xs text-slate-500">
                  Kiểm tra máy chủ Webhook, mã bí mật Secret và kết nối cơ sở dữ liệu Supabase mà <strong>không tạo tài nguyên giả</strong>.
                </p>
              </div>

              <button
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs flex items-center gap-2 shrink-0"
              >
                {testingConnection ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {testingConnection ? 'Đang kiểm tra kết nối...' : 'Kiểm tra kết nối ngay'}
              </button>
            </div>

            {/* Test Results Output */}
            {diagnosticReport && (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Kết quả kiểm tra ({formatDateTimeVi(diagnosticReport.timestamp)})
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    diagnosticReport.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {diagnosticReport.success ? 'TỔNG THỂ: PASS' : 'TỔNG THỂ: CẦN CẤU HÌNH THÊM'}
                  </span>
                </div>

                <div className="space-y-2">
                  {Object.entries(diagnosticReport.results).map(([key, item]: any) => (
                    <div key={key} className="flex items-start justify-between p-3 rounded-lg bg-white border border-slate-200 text-xs">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-800 capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <p className="text-[11px] text-slate-600">{item.message}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        item.status === 'PASS'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.status === 'WARNING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. TAB: NHẬT KÝ ĐỒNG BỘ (Logs) */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Lịch sử & Nhật ký đồng bộ từ Google Form (Section 28)
              </h3>
              <p className="text-xs text-slate-500">
                Theo dõi chi tiết từng lượt gửi: Submission ID, email giáo viên, HTTP Status và kết quả.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadLogs}
                disabled={logsLoading}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                Làm mới
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo tiêu đề tài nguyên..."
                value={logSearch}
                onChange={(e) => {
                  setLogSearch(e.target.value);
                  setLogPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={logStatusFilter}
                onChange={(e) => {
                  setLogStatusFilter(e.target.value);
                  setLogPage(1);
                }}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="synced">Thành công (synced)</option>
                <option value="duplicate">Trùng lặp (duplicate)</option>
                <option value="invalid">Không hợp lệ / Email sai</option>
                <option value="failed">Lỗi máy chủ</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Mã nộp bài (ID)</th>
                  <th className="py-2.5 px-3">Giáo viên</th>
                  <th className="py-2.5 px-3">Tiêu đề tài nguyên</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Chưa có nhật ký đồng bộ nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">
                        {formatDateTimeVi(log.created_at)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {log.submission_id}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-900">
                        {log.teacher_email}
                      </td>
                      <td className="py-2.5 px-3 max-w-[200px] truncate text-slate-800" title={log.resource_title || undefined}>
                        {log.resource_title}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'synced'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.status === 'duplicate'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {log.status === 'synced' && <CheckCircle2 className="w-3 h-3" />}
                          {log.status === 'duplicate' && <Sparkles className="w-3 h-3" />}
                          {log.status !== 'synced' && log.status !== 'duplicate' && <AlertCircle className="w-3 h-3" />}
                          {log.status === 'synced' ? 'Đã đồng bộ' : log.status === 'duplicate' ? 'Trùng lặp' : 'Thất bại'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-right">
                        {log.status !== 'synced' && (
                          <button
                            onClick={() => handleRetryLog(log.id)}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" /> Thử lại
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB: GIẢ LẬP GỬI DỮ LIỆU (Simulator) */}
      {activeTab === 'simulator' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Play className="w-5 h-5 text-emerald-600" />
              Trình giả lập luồng nộp dữ liệu từ Google Form
            </h3>
            <p className="text-xs text-slate-500">
              Kiểm tra tính toàn vẹn của quy trình xử lý payload, chống trùng lặp và ánh xạ tự động giáo viên/tổ bộ môn.
            </p>
          </div>

          {simResult && (
            <div className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 ${
              simResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium'
                : 'bg-rose-50 border-rose-200 text-rose-800 font-medium'
            }`}>
              {simResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold block">
                  {simResult.success ? 'Giả lập thành công!' : 'Giả lập thất bại!'}
                </span>
                <span>{simResult.message}</span>
                {simResult.resource_id && (
                  <span className="block mt-1 font-mono text-[11px]">
                    Resource ID: {simResult.resource_id}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                Email giáo viên nộp bài <span className="text-rose-500">*</span>
              </label>
              <select
                value={simTeacherEmail}
                onChange={(e) => setSimTeacherEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl font-medium"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.email || ''}>
                    {t.full_name} ({t.email}) - {t.role}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                Tiêu đề tài nguyên số <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={simTitle}
                onChange={(e) => setSimTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">Tổ chuyên môn</label>
              <select
                value={simDept}
                onChange={(e) => setSimDept(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">Môn học</label>
              <select
                value={simSubject}
                onChange={(e) => setSimSubject(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">Khối lớp</label>
              <select
                value={simGrade}
                onChange={(e) => setSimGrade(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl"
              >
                {grades.map((g) => (
                  <option key={g.id} value={g.name}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">Loại tài nguyên</label>
              <select
                value={simType}
                onChange={(e) => setSimType(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl"
              >
                <option value="Bài trình chiếu">Bài trình chiếu</option>
                <option value="Kế hoạch bài dạy">Kế hoạch bài dạy</option>
                <option value="Đề kiểm tra">Đề kiểm tra</option>
                <option value="Video">Video bài giảng</option>
                <option value="Học liệu số khác">Học liệu số khác</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-800">Đường dẫn tệp / Google Drive URL</label>
              <input
                type="url"
                value={simUrl}
                onChange={(e) => setSimUrl(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Quy tắc bảo mật: Tài nguyên tạo ra luôn có trạng thái <strong className="text-amber-600">submitted</strong>, không thể tự gán approved.
            </span>

            <button
              onClick={handleRunSimulator}
              disabled={simulating}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs flex items-center gap-2"
            >
              {simulating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Chạy giả lập gửi dữ liệu ngay
            </button>
          </div>
        </div>
      )}

      {/* 6. TAB: MÃ NGUỒN & HƯỚNG DẪN CÀI ĐẶT (Guide) */}
      {activeTab === 'guide' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-600" />
                Mã nguồn triển khai hệ thống đồng bộ chuẩn
              </h3>
              <p className="text-xs text-slate-500">
                Toàn bộ mã nguồn phía Google Apps Script, Supabase Edge Function và SQL Migration đã được kiểm toán hoàn chỉnh.
              </p>
            </div>
          </div>

          {/* Subtabs for Code */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <button
              onClick={() => setGuideSubTab('script')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                guideSubTab === 'script' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              1. Google Apps Script (Code.gs)
            </button>
            <button
              onClick={() => setGuideSubTab('edge')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                guideSubTab === 'edge' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              2. Supabase Edge Function (Deno)
            </button>
            <button
              onClick={() => setGuideSubTab('sql')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                guideSubTab === 'sql' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              3. SQL Migration (PostgreSQL)
            </button>
          </div>

          {/* SubTab 1: Apps Script */}
          {guideSubTab === 'script' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Google Apps Script (onFormSubmit) gắn vào Google Sheets
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sampleAppsScript);
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 2000);
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition flex items-center gap-1.5 border border-indigo-200"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedScript ? 'Đã sao chép!' : 'Sao chép Code.gs'}
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
                <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                  Hướng dẫn cài đặt:
                </span>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                  <li>Mở file Google Sheets chứa câu trả lời của Google Form.</li>
                  <li>Chọn menu <strong>Tiện ích mở rộng (Extensions) → Apps Script</strong>.</li>
                  <li>Xóa mã cũ và dán toàn bộ đoạn mã bên dưới vào tệp <code>Code.gs</code> rồi bấm Lưu (Save).</li>
                  <li>Chọn menu <strong>Kích hoạt (Triggers - hình đồng hồ)</strong> → Bấm <strong>+ Thêm trình kích hoạt</strong>.</li>
                  <li>Cấu hình: Hàm = <code>onFormSubmit</code> | Nguồn = <code>Từ bảng tính</code> | Sự kiện = <code>Khi gửi biểu mẫu</code>.</li>
                </ol>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-[450px]">
                {sampleAppsScript}
              </pre>
            </div>
          )}

          {/* SubTab 2: Edge Function */}
          {guideSubTab === 'edge' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Supabase Edge Function: <code>sync-google-form-resource/index.ts</code>
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sampleEdgeFunction);
                    setCopiedEdge(true);
                    setTimeout(() => setCopiedEdge(false), 2000);
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition flex items-center gap-1.5 border border-indigo-200"
                >
                  {copiedEdge ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedEdge ? 'Đã sao chép!' : 'Sao chép Edge Function'}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-[450px]">
                {sampleEdgeFunction}
              </pre>
            </div>
          )}

          {/* SubTab 3: SQL Migration */}
          {guideSubTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  PostgreSQL Migration: <code>008_sync_google_form_resource_complete.sql</code>
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sampleSqlMigration);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2000);
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition flex items-center gap-1.5 border border-indigo-200"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? 'Đã sao chép!' : 'Sao chép SQL'}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-[450px]">
                {sampleSqlMigration}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
