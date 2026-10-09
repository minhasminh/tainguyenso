import React, { useState } from 'react';
import {
  Server,
  FolderTree,
  Terminal,
  UploadCloud,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

export function DeploymentGuidePage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const htaccessContent = `<IfModule mod_rewrite.c>
    RewriteEngine On

    RewriteBase /

    RewriteRule ^index\\.html$ - [L]

    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d

    RewriteRule . /index.html [L]
</IfModule>`;

  const envContent = `# File .env ở thư mục gốc của dự án
# LƯU Ý: Biến VITE_* phải có mặt tại thời điểm build (npm run build)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-legacy-anon-key`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans pb-16">
      {/* Breadcrumb & Header */}
      <div>
        <a
          href="#/settings"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 transition mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Quay lại Cài đặt
        </a>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Server className="w-7 h-7 text-blue-600" />
          HƯỚNG DẪN TRIỂN KHAI PRODUCTION (cPanel / Apache / Hosting)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Quy trình chuẩn 5 bước đóng gói và khắc phục triệt để trang báo lỗi mặc định của Apache
        </p>
      </div>

      {/* Quick Alert on Apache Default Page */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold">
            Khắc phục lỗi: "If you are the owner of this website, please contact your hosting provider..."
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Lỗi này xảy ra khi máy chủ web Apache đang hiển thị file tĩnh mặc định của nhà cung cấp hosting thay vì file code của ứng dụng. Nguyên nhân 99% là do <strong>thư mục Document Root trỏ sai</strong> hoặc <strong>chưa upload đúng vị trí file index.html</strong>. Thực hiện đúng các bước bên dưới sẽ giải quyết triệt để!
          </p>
        </div>
      </div>

      {/* 5-Step Core Deployment Guide */}
      <div className="space-y-6">
        {/* BƯỚC 1 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
              1
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                BƯỚC 1: Cấu hình biến môi trường
              </h2>
              <p className="text-xs text-slate-500">
                Tạo và điền thông tin Supabase vào file <code className="font-mono">.env</code>
              </p>
            </div>
          </div>

          <div className="relative">
            <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto">
              {envContent}
            </pre>
            <button
              onClick={() => handleCopy(envContent, 'env')}
              className="absolute top-3 right-3 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedSection === 'env' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSection === 'env' ? 'Đã sao chép' : 'Sao chép'}
            </button>
          </div>
          <div className="text-xs text-slate-500 italic">
            * Tuyệt đối KHÔNG đưa SUPABASE_SERVICE_ROLE_KEY vào frontend. Chỉ dùng Anon Key công khai.
          </div>
        </div>

        {/* BƯỚC 2 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                BƯỚC 2: Cài đặt thư viện dependencies
              </h2>
              <p className="text-xs text-slate-500">
                Đảm bảo tất cả các gói cần thiết được cài đặt đầy đủ
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs flex items-center justify-between">
            <code>npm install</code>
            <button
              onClick={() => handleCopy('npm install', 'install')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1 cursor-pointer"
            >
              {copiedSection === 'install' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedSection === 'install' ? 'Đã chép' : 'Sao chép'}
            </button>
          </div>
        </div>

        {/* BƯỚC 3 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
              3
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                BƯỚC 3: Đóng gói mã nguồn (Build)
              </h2>
              <p className="text-xs text-slate-500">
                Vite sẽ nhúng các biến môi trường và tạo ra thư mục phân phối <code className="font-mono font-bold">dist/</code>
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs flex items-center justify-between">
            <code>npm run build</code>
            <button
              onClick={() => handleCopy('npm run build', 'build')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1 cursor-pointer"
            >
              {copiedSection === 'build' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedSection === 'build' ? 'Đã chép' : 'Sao chép'}
            </button>
          </div>
        </div>

        {/* BƯỚC 4 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
              4
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                BƯỚC 4: Kiểm tra thư mục dist/ sau khi build
              </h2>
              <p className="text-xs text-slate-500">
                Thư mục <code className="font-mono font-bold text-blue-600">dist/</code> bắt buộc phải có đầy đủ cấu trúc:
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs space-y-1 text-slate-800">
            <div className="font-bold text-blue-700">dist/</div>
            <div className="pl-4 text-emerald-700">├── index.html <span className="text-slate-400 font-normal">(File cổng chính ứng dụng SPA)</span></div>
            <div className="pl-4 text-emerald-700">├── .htaccess <span className="text-slate-400 font-normal">(Cấu hình Rewrite Apache tránh lỗi F5 404)</span></div>
            <div className="pl-4 text-emerald-700">├── deployment-check.html <span className="text-slate-400 font-normal">(Trang test tĩnh)</span></div>
            <div className="pl-4 text-emerald-700">└── assets/ <span className="text-slate-400 font-normal">(Chứa JS, CSS đã nén tối ưu)</span></div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-2">
            <div className="text-slate-400 flex items-center justify-between">
              <span>Nội dung file public/.htaccess:</span>
              <button
                onClick={() => handleCopy(htaccessContent, 'htaccess')}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] flex items-center gap-1 cursor-pointer"
              >
                {copiedSection === 'htaccess' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedSection === 'htaccess' ? 'Đã chép' : 'Sao chép file .htaccess'}
              </button>
            </div>
            <pre className="text-blue-300 overflow-x-auto">{htaccessContent}</pre>
          </div>
        </div>

        {/* BƯỚC 5 & KIỂM TRA DOCUMENT ROOT */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
              5
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                BƯỚC 5: Tải lên cPanel và kiểm tra Document Root
              </h2>
              <p className="text-xs text-slate-500">
                Mở cPanel → File Manager → vào thư mục Document Root
              </p>
            </div>
          </div>

          {/* Document Root Instruction */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3 text-xs text-blue-950">
            <div className="font-bold text-blue-900 flex items-center gap-1.5">
              <FolderTree className="w-4 h-4 text-blue-600" />
              Cách kiểm tra Document Root trên cPanel:
            </div>
            <p className="leading-relaxed">
              Vào cPanel → Nhấn vào <strong>Domains</strong> (hoặc Addon Domains / Subdomains). Cột <strong>Document Root</strong> sẽ ghi rõ đường dẫn thư mục gốc mà tên miền trỏ vào.
            </p>
            <div className="p-3 rounded-lg bg-white border border-blue-200 font-mono text-[11px] text-slate-700 space-y-1">
              <div>Ví dụ Document Root là: <strong className="text-blue-700">/home/USERNAME/public_html/tainguyenso</strong></div>
              <div>Thì file index.html phải nằm ở: <strong className="text-emerald-700">/home/USERNAME/public_html/tainguyenso/index.html</strong></div>
            </div>
          </div>

          {/* DOs and DON'Ts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* DO */}
            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-2 text-emerald-950">
              <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ĐÚNG (Upload NỘI DUNG của dist):
              </div>
              <div className="font-mono text-[11px] bg-white p-2.5 rounded border border-emerald-200 space-y-0.5 text-slate-700">
                <div>public_html/</div>
                <div className="pl-3 text-emerald-700">├── index.html</div>
                <div className="pl-3 text-emerald-700">├── .htaccess</div>
                <div className="pl-3 text-emerald-700">├── deployment-check.html</div>
                <div className="pl-3 text-emerald-700">└── assets/</div>
              </div>
              <p className="text-[11px] text-emerald-800">
                Giải nén hoặc copy các file bên trong thư mục dist trực tiếp vào Document Root.
              </p>
            </div>

            {/* DON'T */}
            <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200 space-y-2 text-rose-950">
              <div className="font-bold text-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                SAI (Upload nguyên cả folder dist):
              </div>
              <div className="font-mono text-[11px] bg-white p-2.5 rounded border border-rose-200 space-y-0.5 text-slate-700">
                <div>public_html/</div>
                <div className="pl-3 text-rose-600">└── dist/</div>
                <div className="pl-6 text-rose-600">└── index.html</div>
              </div>
              <p className="text-[11px] text-rose-800">
                Nếu làm như thế này, trình duyệt vào domain sẽ gặp lỗi 403 / 404 hoặc trang mặc định của Apache, trừ khi bạn đổi Document Root trong cPanel thành <code className="font-mono">public_html/dist</code>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Link to Health Check */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div>
          <h3 className="text-base font-bold">
            Kiểm tra sức khỏe hệ thống sau khi upload
          </h3>
          <p className="text-xs text-blue-100 mt-0.5">
            Mở trang Deployment Health Check để xác minh 10 tiêu chí an toàn trước khi bàn giao
          </p>
        </div>
        <a
          href="#/deployment-check"
          className="px-5 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl text-xs transition shadow-xs cursor-pointer whitespace-nowrap"
        >
          Mở DEPLOYMENT HEALTH CHECK →
        </a>
      </div>
    </div>
  );
}
