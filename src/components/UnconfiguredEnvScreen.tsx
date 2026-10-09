import React, { useState } from 'react';
import {
  AlertTriangle,
  FileCode,
  Terminal,
  FolderUp,
  Server,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { validateSupabaseEnv } from '../lib/supabase';

interface UnconfiguredEnvScreenProps {
  onBypass?: () => void;
  onOpenConfigModal?: () => void;
}

export function UnconfiguredEnvScreen({
  onBypass,
  onOpenConfigModal,
}: UnconfiguredEnvScreenProps) {
  const envStatus = validateSupabaseEnv();
  const [copied, setCopied] = useState(false);

  const envSample = `VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-legacy-anon-key`;

  const handleCopy = () => {
    navigator.clipboard.writeText(envSample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-2xl w-full bg-white rounded-2xl border border-slate-200/80 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-5 text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              CHƯA CẤU HÌNH MÔI TRƯỜNG PRODUCTION
            </h1>
            <p className="text-xs text-amber-100">
              Hệ thống Quản lý Tài nguyên số Giáo viên yêu cầu kết nối cơ sở dữ liệu Supabase.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Issue Alert */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs sm:text-sm space-y-2">
            <div className="font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Phát hiện thiếu biến môi trường cần thiết:
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-amber-800 pl-2">
              {envStatus.issues.map((issue, idx) => (
                <li key={idx} className="font-mono">{issue}</li>
              ))}
            </ul>
          </div>

          {/* 5-Step Resolution Guide */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-600" />
              Hướng dẫn thiết lập 5 bước hoàn tất triển khai
            </h2>

            <ol className="space-y-3">
              {/* Step 1 */}
              <li className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div className="flex-1 text-xs text-slate-700">
                  <div className="font-semibold text-slate-900 mb-0.5">
                    Mở file <code className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono font-bold">.env</code> ở thư mục gốc của dự án
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Nếu chưa có file, bạn sao chép từ file mẫu <code className="font-mono">.env.example</code> sang <code className="font-mono">.env</code>.
                  </p>
                </div>
              </li>

              {/* Step 2 & 3 */}
              <li className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2 & 3
                </span>
                <div className="flex-1 text-xs text-slate-700">
                  <div className="font-semibold text-slate-900 mb-1">
                    Thêm <code className="px-1 py-0.5 bg-slate-200 rounded font-mono text-[11px]">VITE_SUPABASE_URL</code> và <code className="px-1 py-0.5 bg-slate-200 rounded font-mono text-[11px]">VITE_SUPABASE_ANON_KEY</code>
                  </div>
                  <div className="relative mt-2">
                    <pre className="p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                      {envSample}
                    </pre>
                    <button
                      onClick={handleCopy}
                      className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] flex items-center gap-1 cursor-pointer transition"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>
              </li>

              {/* Step 4 */}
              <li className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <div className="flex-1 text-xs text-slate-700">
                  <div className="font-semibold text-slate-900 mb-0.5">
                    Chạy lệnh build để đóng gói ứng dụng
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs inline-block mt-1">
                    npm run build
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1">
                    Vite sẽ tự động nhúng các biến môi trường vào thư mục <code className="font-mono">dist/</code>.
                  </p>
                </div>
              </li>

              {/* Step 5 */}
              <li className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  5
                </span>
                <div className="flex-1 text-xs text-slate-700">
                  <div className="font-semibold text-slate-900 mb-0.5">
                    Deploy lại toàn bộ NỘI DUNG thư mục <code className="font-mono text-blue-600 font-bold">dist/</code>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Tải nội dung bên trong <code className="font-mono">dist/</code> (gồm <code className="font-mono">index.html</code>, <code className="font-mono">.htaccess</code>, <code className="font-mono">assets/</code>) lên thư mục Document Root (thường là <code className="font-mono">public_html</code>) trên cPanel/Apache.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          {/* Action buttons */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <a
              href="#/deployment-check"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Server className="w-4 h-4" />
              Kiểm tra Deploy (Health Check)
            </a>

            <div className="flex items-center gap-2 justify-end">
              {onOpenConfigModal && (
                <button
                  type="button"
                  onClick={onOpenConfigModal}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer"
                >
                  Cấu hình nhanh tại đây
                </button>
              )}

              {onBypass && (
                <button
                  type="button"
                  onClick={onBypass}
                  className="px-3.5 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-medium transition cursor-pointer"
                >
                  Tiếp tục xem thử →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
