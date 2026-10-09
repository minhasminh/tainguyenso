import React, { useState } from 'react';
import {
  Settings,
  Server,
  Database,
  Building2,
  BookOpen,
  GraduationCap,
  Layers,
  FileSpreadsheet,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import {
  checkSupabaseConnection,
  getSupabaseCredentials,
  validateSupabaseEnv,
} from '../lib/supabase';

export function SettingsPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'SCHOOL_ADMIN';

  const [testingDb, setTestingDb] = useState(false);
  const [dbResult, setDbResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);

  const creds = getSupabaseCredentials();
  const envValidation = validateSupabaseEnv();

  const handleTestDatabase = async () => {
    setTestingDb(true);
    try {
      const res = await checkSupabaseConnection();
      setDbResult(res);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (e: any) {
      toast.error('Lỗi kiểm tra kết nối: ' + e.message);
    } finally {
      setTestingDb(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-blue-600" />
          CÀI ĐẶT HỆ THỐNG
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Cấu hình môi trường máy chủ, kết nối cơ sở dữ liệu Supabase và danh mục dùng chung
        </p>
      </div>

      {/* Deployment & Production Server Card (Section XII & VI) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-600" />
              Triển khai Hosting & Kiểm tra Sức khỏe Hệ thống (Deployment)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hướng dẫn cấu hình cPanel/Apache, Document Root, chống lỗi F5 404 và kiểm tra toàn diện
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="#/deployment-check"
            className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition flex items-center justify-between group"
          >
            <div className="space-y-1">
              <div className="font-bold text-xs text-blue-900 flex items-center gap-2">
                DEPLOYMENT HEALTH CHECK
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-200 text-blue-800 font-bold">10 Tiêu chí</span>
              </div>
              <p className="text-[11px] text-blue-700">
                Kiểm tra trực tiếp HTTPS, URL, Supabase, Authentication, Webhook và SPA Routing.
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-500 group-hover:translate-x-1 transition shrink-0" />
          </a>

          <a
            href="#/settings/deployment"
            className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition flex items-center justify-between group"
          >
            <div className="space-y-1">
              <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                HƯỚNG DẪN DEPLOY 5 BƯỚC
              </div>
              <p className="text-[11px] text-slate-600">
                Quy trình build npm, kiểm tra file dist/.htaccess và cấu hình Document Root cPanel.
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition shrink-0" />
          </a>
        </div>
      </div>

      {/* Supabase Database Connection Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              Cơ sở Dữ liệu Supabase Cloud
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý kết nối PostgreSQL đám mây, RLS và chính sách phân quyền RBAC
            </p>
          </div>

          <button
            onClick={handleTestDatabase}
            disabled={testingDb}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingDb ? 'animate-spin' : ''}`} />
            {testingDb ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
          </button>
        </div>

        {/* Credentials Display (Không làm lộ full secret key) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-400 text-[11px]">VITE_SUPABASE_URL:</span>
            <div className="font-mono text-slate-800 truncate font-semibold">
              {creds.url || 'Chưa cấu hình trong .env'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-400 text-[11px]">VITE_SUPABASE_ANON_KEY (Được bảo vệ):</span>
            <div className="font-mono text-slate-800 truncate font-semibold">
              {creds.maskedKey}
            </div>
          </div>
        </div>

        {/* Test Result Message */}
        {dbResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-1 ${
              dbResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="font-bold flex items-center gap-2">
              {dbResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              {dbResult.message}
            </div>
            {dbResult.details && <div className="text-[11px] opacity-90">{dbResult.details}</div>}
          </div>
        )}
      </div>

      {/* Master Data Management Quick Links (Rule 1: Bảo toàn Tổ, Môn, Khối, Loại học liệu) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          Danh mục Master Data Giáo dục (Chuẩn hóa)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <a
            href="#/admin/departments"
            className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-white transition flex items-center gap-2.5"
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-800">Tổ chuyên môn</span>
          </a>

          <a
            href="#/admin/subjects"
            className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-white transition flex items-center gap-2.5"
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-800">Môn học</span>
          </a>

          <a
            href="#/admin/grades"
            className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-white transition flex items-center gap-2.5"
          >
            <GraduationCap className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-slate-800">Khối lớp</span>
          </a>

          <a
            href="#/admin/resource-types"
            className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-white transition flex items-center gap-2.5"
          >
            <Layers className="w-4 h-4 text-purple-600" />
            <span className="font-semibold text-slate-800">Loại học liệu</span>
          </a>
        </div>
      </div>
    </div>
  );
}
