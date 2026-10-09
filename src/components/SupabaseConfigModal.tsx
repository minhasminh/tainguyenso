import React, { useState } from 'react';
import {
  Database,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Terminal,
  Download,
} from 'lucide-react';
import {
  getSupabaseCredentials,
  saveCustomSupabaseCredentials,
  clearCustomSupabaseCredentials,
  testConnection,
} from '../lib/supabase/client';
import { useToast } from '../hooks/useToast';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupabaseConfigModal({ isOpen, onClose }: SupabaseConfigModalProps) {
  const toast = useToast();
  const creds = getSupabaseCredentials();

  const [url, setUrl] = useState(creds.url || '');
  const [anonKey, setAnonKey] = useState(creds.anonKey || '');
  const [activeTab, setActiveTab] = useState<'config' | 'migration' | 'seed' | 'firstAdmin'>('config');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedMigration, setCopiedMigration] = useState(false);
  const [copiedSeed, setCopiedSeed] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!url.trim() || !anonKey.trim()) {
      toast.error('Vui lòng nhập đầy đủ Supabase Project URL và Anon Key');
      return;
    }
    saveCustomSupabaseCredentials(url, anonKey);
    toast.success('Đã lưu cấu hình kết nối Supabase');
    await runTest();
  };

  const handleReset = () => {
    clearCustomSupabaseCredentials();
    const defaults = getSupabaseCredentials();
    setUrl(defaults.url);
    setAnonKey(defaults.anonKey);
    setTestResult(null);
    toast.info('Đã khôi phục cài đặt mặc định');
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testConnection();
      setTestResult(res);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } finally {
      setTesting(false);
    }
  };

  const migrationSql = `-- PHIÊN BẢN 1: MIGRATION SUPABASE CHO HỆ THỐNG QUẢN LÝ TÀI NGUYÊN SỐ GIÁO VIÊN
-- Copy toàn bộ đoạn mã này và dán vào Supabase Dashboard -> SQL Editor -> Run

DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('ADMIN', 'TEACHER', 'SUBJECT_LEADER', 'VICE_SUBJECT_LEADER', 'SCHOOL_ADMIN', 'VICE_PRINCIPAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'locked');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    leader_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    role public.user_role NOT NULL DEFAULT 'TEACHER',
    status public.user_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DO $$ BEGIN
    ALTER TABLE public.departments ADD CONSTRAINT fk_departments_leader
    FOREIGN KEY (leader_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subject ON public.profiles(subject_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_department_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT department_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_user_active()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(status = 'active', false) FROM public.profiles WHERE id = auth.uid();
$$;

-- Ngăn chặn giáo viên tự ý nâng quyền role hoặc status
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_updates()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    current_caller_role public.user_role;
BEGIN
    SELECT role INTO current_caller_role FROM public.profiles WHERE id = auth.uid();
    IF current_caller_role IS NULL OR current_caller_role != 'ADMIN' THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Bạn không có quyền thay đổi vai trò tài khoản (Chỉ Quản trị viên).';
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status AND current_caller_role NOT IN ('SCHOOL_ADMIN', 'VICE_PRINCIPAL') THEN
            RAISE EXCEPTION 'Bạn không có quyền thay đổi trạng thái kích hoạt tài khoản.';
        END IF;
        IF current_caller_role = 'TEACHER' AND (NEW.department_id IS DISTINCT FROM OLD.department_id OR NEW.subject_id IS DISTINCT FROM OLD.subject_id) THEN
            RAISE EXCEPTION 'Giáo viên không có quyền tự thay đổi Tổ chuyên môn hoặc Bộ môn.';
        END IF;
    END IF;
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_unauthorized_profile_updates ON public.profiles;
CREATE TRIGGER trg_prevent_unauthorized_profile_updates
    BEFORE UPDATE ON public.profiles FOR EACH ROW
    EXECUTE FUNCTION public.prevent_unauthorized_profile_updates();

-- Tự động thêm profile khi tạo tài khoản Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, status)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), NEW.email, 'TEACHER', 'active')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- BẬT ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT TO authenticated
USING (
    public.is_user_active() AND (
        public.get_user_role() IN ('ADMIN', 'SCHOOL_ADMIN', 'VICE_PRINCIPAL') OR
        (public.get_user_role() IN ('SUBJECT_LEADER', 'VICE_SUBJECT_LEADER') AND department_id = public.get_user_department_id()) OR
        (id = auth.uid())
    )
);

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE TO authenticated
USING (public.is_user_active() AND (public.get_user_role() = 'ADMIN' OR (public.get_user_role() IN ('SCHOOL_ADMIN', 'VICE_PRINCIPAL') AND role != 'ADMIN') OR id = auth.uid()))
WITH CHECK (public.is_user_active() AND (public.get_user_role() = 'ADMIN' OR (public.get_user_role() IN ('SCHOOL_ADMIN', 'VICE_PRINCIPAL') AND role != 'ADMIN') OR id = auth.uid()));

DROP POLICY IF EXISTS "departments_select_policy" ON public.departments;
CREATE POLICY "departments_select_policy" ON public.departments FOR SELECT TO authenticated USING (public.is_user_active());

DROP POLICY IF EXISTS "subjects_select_policy" ON public.subjects;
CREATE POLICY "subjects_select_policy" ON public.subjects FOR SELECT TO authenticated USING (public.is_user_active());

DROP POLICY IF EXISTS "grades_select_policy" ON public.grades;
CREATE POLICY "grades_select_policy" ON public.grades FOR SELECT TO authenticated USING (public.is_user_active());

DROP POLICY IF EXISTS "activity_logs_select_policy" ON public.activity_logs;
CREATE POLICY "activity_logs_select_policy" ON public.activity_logs FOR SELECT TO authenticated
USING (public.is_user_active() AND public.get_user_role() IN ('ADMIN', 'SCHOOL_ADMIN', 'VICE_PRINCIPAL'));

DROP POLICY IF EXISTS "activity_logs_insert_policy" ON public.activity_logs;
CREATE POLICY "activity_logs_insert_policy" ON public.activity_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- DANH MỤC NĂM HỌC
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- DANH MỤC LOẠI HỌC LIỆU
CREATE TABLE IF NOT EXISTS public.resource_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- BẢNG TÀI NGUYÊN SỐ (resources)
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    grade_id UUID REFERENCES public.grades(id) ON DELETE SET NULL,
    class_name TEXT,
    school_year TEXT DEFAULT '2026–2027',
    topic TEXT,
    resource_type TEXT NOT NULL,
    resource_url TEXT NOT NULL,
    file_name TEXT,
    file_extension TEXT,
    file_size BIGINT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    subject_leader_reviewed_at TIMESTAMPTZ,
    subject_leader_reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    school_reviewed_at TIMESTAMPTZ,
    school_reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    archived_at TIMESTAMPTZ,
    archived_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- BẢNG LỊCH SỬ DUYỆT (approval_history)
CREATE TABLE IF NOT EXISTS public.approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    action TEXT NOT NULL,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "academic_years_select" ON public.academic_years;
CREATE POLICY "academic_years_select" ON public.academic_years FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "resource_types_select" ON public.resource_types;
CREATE POLICY "resource_types_select" ON public.resource_types FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "resources_select_policy" ON public.resources;
CREATE POLICY "resources_select_policy" ON public.resources FOR SELECT TO authenticated USING (
    status = 'approved' OR
    owner_id = auth.uid() OR
    public.get_user_role() IN ('ADMIN', 'SCHOOL_ADMIN', 'VICE_PRINCIPAL') OR
    (public.get_user_role() IN ('SUBJECT_LEADER', 'VICE_SUBJECT_LEADER') AND department_id = public.get_user_department_id())
);

DROP POLICY IF EXISTS "resources_insert_policy" ON public.resources;
CREATE POLICY "resources_insert_policy" ON public.resources FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid() OR public.get_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "resources_update_policy" ON public.resources;
CREATE POLICY "resources_update_policy" ON public.resources FOR UPDATE TO authenticated
USING (
    public.get_user_role() IN ('ADMIN', 'SCHOOL_ADMIN', 'VICE_PRINCIPAL') OR
    (public.get_user_role() IN ('SUBJECT_LEADER', 'VICE_SUBJECT_LEADER') AND department_id = public.get_user_department_id()) OR
    (owner_id = auth.uid() AND status IN ('draft', 'revision_required'))
);

DROP POLICY IF EXISTS "resources_delete_policy" ON public.resources;
CREATE POLICY "resources_delete_policy" ON public.resources FOR DELETE TO authenticated
USING (public.is_user_active() AND (public.get_user_role() = 'ADMIN' OR (owner_id = auth.uid() AND status IN ('draft', 'revision_required'))));

DROP POLICY IF EXISTS "approval_history_policy" ON public.approval_history;
CREATE POLICY "approval_history_policy" ON public.approval_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- NOTIFICATIONS & REALTIME
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'SYSTEM',
    resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_user_policy" ON public.notifications;
CREATE POLICY "notifications_user_policy" ON public.notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() IS NOT NULL);

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.resources, public.notifications, public.approval_history, public.activity_logs;
EXCEPTION WHEN OTHERS THEN null; END $$;
`;

  const seedSql = `-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA)
INSERT INTO public.departments (name, description) VALUES 
('Tổ Toán – Tin', 'Phụ trách môn Toán học và Tin học'),
('Tổ Ngữ văn', 'Phụ trách môn Ngữ văn cấp THCS'),
('Tổ Khoa học tự nhiên', 'Phụ trách môn KHTN (Lí, Hóa, Sinh)'),
('Tổ Ngoại ngữ', 'Phụ trách môn Tiếng Anh'),
('Tổ Sử – Địa – GDCD', 'Phụ trách môn Lịch sử, Địa lí, GDCD')
ON CONFLICT DO NOTHING;

INSERT INTO public.subjects (name, code) VALUES
('Toán', 'MATH'),
('Tin học', 'CS'),
('Ngữ văn', 'LIT'),
('Tiếng Anh', 'ENG'),
('Khoa học tự nhiên (KHTN)', 'SCI'),
('Lịch sử và Địa lí', 'HIST_GEO'),
('Giáo dục công dân (GDCD)', 'CIVIC'),
('Giáo dục thể chất (GDTC)', 'PE'),
('Công nghệ', 'TECH'),
('Âm nhạc', 'MUSIC'),
('Mĩ thuật', 'ART')
ON CONFLICT DO NOTHING;

INSERT INTO public.grades (name) VALUES
('Khối 6'), ('Khối 7'), ('Khối 8'), ('Khối 9')
ON CONFLICT DO NOTHING;
`;

  const copyToClipboard = (text: string, type: 'migration' | 'seed') => {
    navigator.clipboard.writeText(text);
    if (type === 'migration') {
      setCopiedMigration(true);
      setTimeout(() => setCopiedMigration(false), 2000);
    } else {
      setCopiedSeed(true);
      setTimeout(() => setCopiedSeed(false), 2000);
    }
    toast.success('Đã sao chép mã SQL vào bộ nhớ đệm!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Trung tâm Cấu hình Supabase & Database</h2>
              <p className="text-xs text-slate-500">Quản lý kết nối PostgreSQL, RLS Policies và Migration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-5 bg-white text-xs font-medium gap-6">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 border-b-2 transition cursor-pointer ${
              activeTab === 'config'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Kết nối API Keys
          </button>
          <button
            onClick={() => setActiveTab('migration')}
            className={`py-3 border-b-2 transition cursor-pointer ${
              activeTab === 'migration'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Migration SQL (RLS & Schema)
          </button>
          <button
            onClick={() => setActiveTab('seed')}
            className={`py-3 border-b-2 transition cursor-pointer ${
              activeTab === 'seed'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Seed Data SQL
          </button>
          <button
            onClick={() => setActiveTab('firstAdmin')}
            className={`py-3 border-b-2 transition cursor-pointer ${
              activeTab === 'firstAdmin'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Hướng dẫn tạo Admin đầu tiên
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-sm">
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-medium">Trạng thái kết nối hiện tại:</div>
                  <div className="flex items-center gap-2 mt-1">
                    {creds.isLiveConfigured ? (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="font-semibold text-emerald-800 text-xs sm:text-sm">
                          Đã liên kết Supabase Live Project
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        <span className="font-semibold text-amber-800 text-xs sm:text-sm">
                          Môi trường Dev Sandbox (Hỗ trợ thử nghiệm RBAC & RLS đầy đủ)
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={runTest}
                  disabled={testing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  Kiểm tra kết nối
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  VITE_SUPABASE_URL (Project URL)
                </label>
                <input
                  type="text"
                  placeholder="https://your-project-ref.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Lấy từ Supabase Dashboard: Project Settings &rarr; API &rarr; Project URL
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  VITE_SUPABASE_ANON_KEY (Public Anon Key)
                </label>
                <textarea
                  rows={3}
                  placeholder="sb_publishable_... hoặc eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono resize-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Lấy từ Supabase Dashboard: Project Settings &rarr; API &rarr; Project API keys (anon public hoặc sb_publishable_*)
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Xóa thông số tùy chỉnh
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition shadow-xs cursor-pointer"
                >
                  Lưu & Áp dụng kết nối
                </button>
              </div>
            </div>
          )}

          {activeTab === 'migration' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Chạy script này trong <strong>Supabase Dashboard &rarr; SQL Editor</strong> để khởi tạo toàn bộ ENUM, Tables, Triggers, Functions và Row Level Security:
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href="/api/database/complete-setup.sql"
                    download="complete_setup.sql"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Tải file complete_setup.sql
                  </a>
                  <button
                    onClick={() => copyToClipboard(migrationSql, 'migration')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  >
                    {copiedMigration ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedMigration ? 'Đã chép SQL' : 'Sao chép SQL'}
                  </button>
                </div>
              </div>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-[360px] leading-relaxed">
                {migrationSql}
              </pre>
            </div>
          )}

          {activeTab === 'seed' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Dữ liệu mẫu chuẩn bị cho 5 Tổ chuyên môn, 11 Bộ môn và 4 Khối lớp:
                </p>
                <button
                  onClick={() => copyToClipboard(seedSql, 'seed')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  {copiedSeed ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSeed ? 'Đã chép SQL' : 'Sao chép SQL'}
                </button>
              </div>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-[360px] leading-relaxed">
                {seedSql}
              </pre>
            </div>
          )}

          {activeTab === 'firstAdmin' && (
            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Quy tắc bảo mật: Không hard-code tài khoản Admin vào mã nguồn production
                </h4>
                <p>
                  Để đảm bảo an toàn trường học, tài khoản Quản trị viên (ADMIN) đầu tiên được tạo trực tiếp thông qua Supabase Auth Dashboard hoặc câu lệnh SQL an toàn.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Tạo tài khoản trong Supabase Authentication:</p>
                    <p className="text-slate-500">
                      Mở <strong>Supabase Dashboard &rarr; Authentication &rarr; Users &rarr; Add User</strong>. Nhập Email (ví dụ: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">admin@thcs.edu.vn</code>) và mật khẩu quản trị mạnh.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Nâng cấp role lên ADMIN trong bảng profiles:</p>
                    <p className="text-slate-500 mb-2">
                      Mở <strong>SQL Editor</strong> và chạy câu lệnh sau:
                    </p>
                    <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px]">
{`UPDATE public.profiles
SET 
    full_name = 'Quản trị viên Hệ thống',
    role = 'ADMIN',
    status = 'active'
WHERE email = 'admin@thcs.edu.vn';`}
                    </pre>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Đăng nhập và phân quyền các tài khoản khác:</p>
                    <p className="text-slate-500">
                      Dùng tài khoản ADMIN vừa tạo để đăng nhập vào trang web. Sau đó Admin có toàn quyền tạo mới, phân vai trò (TEACHER, SUBJECT_LEADER, SCHOOL_ADMIN) hoặc khóa/mở khóa giáo viên tại trang <strong>/admin/users</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            PostgreSQL &bull; Supabase Auth &bull; Row Level Security
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
}
