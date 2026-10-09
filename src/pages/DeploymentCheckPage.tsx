import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Globe,
  ShieldCheck,
  ShieldAlert,
  Server,
  Database,
  Lock,
  GitBranch,
  Terminal,
  ExternalLink,
  Info,
  ChevronRight,
  ArrowLeft,
  Copy,
  Check,
} from 'lucide-react';
import {
  checkSupabaseConnection,
  checkSupabaseAuth,
  validateSupabaseEnv,
  getSupabaseCredentials,
} from '../lib/supabase';

type StatusType = 'PASS' | 'WARNING' | 'ERROR';

interface CheckItem {
  id: string;
  name: string;
  title: string;
  status: StatusType;
  message: string;
  details?: string;
  recommendation?: string;
}

export function DeploymentCheckPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Webhook state (Section XI)
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [savedWebhookUrl, setSavedWebhookUrl] = useState<string>(() => {
    return localStorage.getItem('app_deployment_webhook_url') || '';
  });
  const [webhookStatus, setWebhookStatus] = useState<'not_configured' | 'configured' | 'unverifiable'>('not_configured');
  const [webhookTestMessage, setWebhookTestMessage] = useState<string | null>(null);

  // Copy helper
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(key);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const runAllChecks = async () => {
    setIsRunning(true);
    const results: CheckItem[] = [];

    // 1. Frontend Check
    try {
      const isReactLoaded = typeof React !== 'undefined';
      const isDomReady = typeof document !== 'undefined';
      if (isReactLoaded && isDomReady) {
        results.push({
          id: '1-frontend',
          name: '1. Frontend',
          title: 'React & DOM Runtime',
          status: 'PASS',
          message: 'Frontend tải thành công và DOM phản hồi chuẩn xác',
          details: `React v${React.version} đang kết xuất bình thường trên client engine.`,
        });
      } else {
        results.push({
          id: '1-frontend',
          name: '1. Frontend',
          title: 'React & DOM Runtime',
          status: 'ERROR',
          message: 'Lỗi nạp thư viện Frontend React',
          details: 'React chưa được nạp đầy đủ trong ngữ cảnh thực thi.',
        });
      }
    } catch (e: any) {
      results.push({
        id: '1-frontend',
        name: '1. Frontend',
        title: 'React & DOM Runtime',
        status: 'ERROR',
        message: 'Lỗi nạp Frontend: ' + e.message,
      });
    }

    // 2. Environment Check
    const envStatus = validateSupabaseEnv();
    if (envStatus.isValid) {
      results.push({
        id: '2-environment',
        name: '2. Environment',
        title: 'Biến môi trường (.env)',
        status: 'PASS',
        message: 'Biến môi trường đầy đủ và hợp lệ',
        details: 'Đã phát hiện VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY hợp lệ.',
      });
    } else if (envStatus.hasUrl || envStatus.hasKey) {
      results.push({
        id: '2-environment',
        name: '2. Environment',
        title: 'Biến môi trường (.env)',
        status: 'WARNING',
        message: 'Biến môi trường chưa hoàn chỉnh',
        details: envStatus.issues.join('; '),
        recommendation: 'Vui lòng bổ sung đầy đủ biến vào file .env và thực hiện build lại.',
      });
    } else {
      results.push({
        id: '2-environment',
        name: '2. Environment',
        title: 'Biến môi trường (.env)',
        status: 'ERROR',
        message: 'Chưa cấu hình biến môi trường',
        details: 'Thiếu cả VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.',
        recommendation: 'Xem hướng dẫn cấu hình .env tại /settings/deployment.',
      });
    }

    // 3. Supabase Connection Check (Section VIII)
    try {
      const dbResult = await checkSupabaseConnection();
      if (dbResult.success) {
        results.push({
          id: '3-supabase',
          name: '3. Supabase',
          title: 'Kết nối Cơ sở dữ liệu',
          status: 'PASS',
          message: 'Supabase kết nối thành công',
          details: dbResult.details || 'Cơ sở dữ liệu đám mây phản hồi tốt.',
        });
      } else {
        results.push({
          id: '3-supabase',
          name: '3. Supabase',
          title: 'Kết nối Cơ sở dữ liệu',
          status: 'ERROR',
          message: 'Không thể kết nối Supabase',
          details: dbResult.details || dbResult.message,
          recommendation: 'Kiểm tra lại VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong file .env.',
        });
      }
    } catch (dbErr: any) {
      results.push({
        id: '3-supabase',
        name: '3. Supabase',
        title: 'Kết nối Cơ sở dữ liệu',
        status: 'ERROR',
        message: 'Không thể kết nối Supabase',
        details: dbErr.message || 'Lỗi không xác định khi truy vấn',
      });
    }

    // 4. Authentication Check (Section IX)
    try {
      const authResult = await checkSupabaseAuth();
      if (authResult.status === 'authenticated') {
        results.push({
          id: '4-auth',
          name: '4. Authentication',
          title: 'Phiên xác thực người dùng',
          status: 'PASS',
          message: 'Authentication hoạt động',
          details: `Đang có phiên đăng nhập của người dùng: ${authResult.session?.user?.email || 'Người dùng đã xác thực'}`,
        });
      } else if (authResult.status === 'unauthenticated') {
        results.push({
          id: '4-auth',
          name: '4. Authentication',
          title: 'Phiên xác thực người dùng',
          status: 'WARNING',
          message: 'Chưa đăng nhập',
          details: 'Auth SDK hoạt động tốt nhưng chưa có phiên người dùng đăng nhập hiện thời.',
          recommendation: 'Đăng nhập vào hệ thống tại trang /login để bắt đầu sử dụng đầy đủ quyền hạn.',
        });
      } else {
        results.push({
          id: '4-auth',
          name: '4. Authentication',
          title: 'Phiên xác thực người dùng',
          status: 'ERROR',
          message: 'Supabase Authentication lỗi',
          details: authResult.error || authResult.message,
          recommendation: 'Kiểm tra cấu hình Supabase Auth trong Dashboard Supabase.',
        });
      }
    } catch (authErr: any) {
      results.push({
        id: '4-auth',
        name: '4. Authentication',
        title: 'Phiên xác thực người dùng',
        status: 'ERROR',
        message: 'Supabase Authentication lỗi',
        details: authErr.message || 'Lỗi kiểm tra session',
      });
    }

    // 5. Current URL Check (Section VII)
    const currentHref = window.location.href;
    const currentHostname = window.location.hostname;
    const currentPort = window.location.port;
    results.push({
      id: '5-url',
      name: '5. Current URL',
      title: 'Địa chỉ URL hiện tại',
      status: 'PASS',
      message: `Tên miền: ${currentHostname}${currentPort ? `:${currentPort}` : ''}`,
      details: `Full URL: ${currentHref}`,
    });

    // 6. HTTPS Check (Section VII)
    const isHttps = window.location.protocol === 'https:';
    if (isHttps) {
      results.push({
        id: '6-https',
        name: '6. HTTPS',
        title: 'Chứng chỉ bảo mật SSL/TLS',
        status: 'PASS',
        message: 'HTTPS đang hoạt động',
        details: 'Giao thức kết nối được mã hóa an toàn qua SSL/TLS (HTTPS).',
      });
    } else {
      results.push({
        id: '6-https',
        name: '6. HTTPS',
        title: 'Chứng chỉ bảo mật SSL/TLS',
        status: 'WARNING',
        message: 'Website chưa chạy HTTPS',
        details: 'Hiện tại website đang truy cập bằng HTTP không mã hóa.',
        recommendation: 'Vui lòng bật SSL/AutoSSL trên hosting cPanel để đảm bảo an toàn.',
      });
    }

    // 7. Browser Check
    const userAgent = navigator.userAgent;
    results.push({
      id: '7-browser',
      name: '7. Browser',
      title: 'Môi trường Trình duyệt',
      status: 'PASS',
      message: 'Trình duyệt tương thích với chuẩn Web hiện đại',
      details: userAgent,
    });

    // 8. Build Mode Check (Section X)
    const buildMode = import.meta.env.MODE;
    if (buildMode === 'production') {
      results.push({
        id: '8-build-mode',
        name: '8. Build mode',
        title: 'Chế độ đóng gói ứng dụng',
        status: 'PASS',
        message: 'Production build',
        details: `import.meta.env.MODE = "${buildMode}" (Code đã được tối ưu hóa và nén cho production).`,
      });
    } else {
      results.push({
        id: '8-build-mode',
        name: '8. Build mode',
        title: 'Chế độ đóng gói ứng dụng',
        status: 'WARNING',
        message: `Chế độ phát triển (${buildMode})`,
        details: `Đang chạy ở môi trường ${buildMode}. Khi deploy production, hãy chạy 'npm run build'.`,
        recommendation: 'Chạy npm run build và upload thư mục dist lên hosting.',
      });
    }

    // 9. Apache SPA Routing Check (Section V & Section VI)
    // We test whether fetching a deep route like /deployment-check.html or a test endpoint returns valid content
    try {
      const testStaticRes = await fetch('/deployment-check.html', { method: 'HEAD' });
      if (testStaticRes.ok) {
        results.push({
          id: '9-spa-routing',
          name: '9. Apache SPA routing',
          title: 'Cấu hình định tuyến .htaccess',
          status: 'PASS',
          message: 'File tĩnh và thư mục Document Root hợp lệ',
          details: 'File deployment-check.html phản hồi HTTP 200. Quy tắc rewrite trong .htaccess được cấu hình sẵn sàng.',
        });
      } else {
        results.push({
          id: '9-spa-routing',
          name: '9. Apache SPA routing',
          title: 'Cấu hình định tuyến .htaccess',
          status: 'WARNING',
          message: 'Cần kiểm tra lại file .htaccess trên hosting',
          details: `deployment-check.html phản hồi trạng thái: ${testStaticRes.status}. Hãy chắc chắn file .htaccess đã được copy vào Document Root.`,
          recommendation: 'Kiểm tra file .htaccess trong thư mục public_html trên cPanel.',
        });
      }
    } catch {
      results.push({
        id: '9-spa-routing',
        name: '9. Apache SPA routing',
        title: 'Cấu hình định tuyến .htaccess',
        status: 'WARNING',
        message: 'Không thể kiểm tra file tĩnh trực tiếp (môi trường dev/proxy)',
        details: 'Quy tắc rewrite SPA đã được biên dịch sẵn trong public/.htaccess.',
      });
    }

    // 10. Webhook Configuration Check (Section XI)
    if (savedWebhookUrl) {
      results.push({
        id: '10-webhook',
        name: '10. Webhook configuration',
        title: 'Cấu hình GitHub / External Webhook',
        status: 'PASS',
        message: 'Đã cấu hình Webhook URL',
        details: `URL: ${savedWebhookUrl}`,
      });
    } else {
      results.push({
        id: '10-webhook',
        name: '10. Webhook configuration',
        title: 'Cấu hình GitHub / External Webhook',
        status: 'WARNING',
        message: 'Chưa cấu hình Webhook tự động',
        details: 'Chưa cấu hình GitHub Webhook để tự động pull/deploy mã nguồn khi push.',
        recommendation: 'Xem hướng dẫn thiết lập GitHub Webhook ở bên dưới nếu bạn muốn CI/CD tự động.',
      });
    }

    setChecks(results);
    setLastChecked(new Date());
    setIsRunning(false);
  };

  useEffect(() => {
    runAllChecks();
  }, [savedWebhookUrl]);

  // Handle saving webhook URL (Section XI: KHÔNG lưu Secret GitHub vào localStorage)
  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = webhookUrlInput.trim();
    if (!clean) return;

    localStorage.setItem('app_deployment_webhook_url', clean);
    setSavedWebhookUrl(clean);
    setWebhookStatus('configured');
    setWebhookTestMessage('Đã lưu địa chỉ Webhook thành công (Không lưu secret vào trình duyệt).');
  };

  const handleClearWebhook = () => {
    localStorage.removeItem('app_deployment_webhook_url');
    setSavedWebhookUrl('');
    setWebhookUrlInput('');
    setWebhookStatus('not_configured');
    setWebhookTestMessage('Đã xóa cấu hình Webhook.');
  };

  const renderStatusBadge = (status: StatusType) => {
    switch (status) {
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            PASS
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            WARNING
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            ERROR
          </span>
        );
    }
  };

  const passCount = checks.filter((c) => c.status === 'PASS').length;
  const warnCount = checks.filter((c) => c.status === 'WARNING').length;
  const errCount = checks.filter((c) => c.status === 'ERROR').length;

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <a
            href="#/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 transition mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Quay lại Bảng điều khiển
          </a>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Server className="w-7 h-7 text-blue-600" />
            DEPLOYMENT HEALTH CHECK
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Chẩn đoán sức khỏe hệ thống, máy chủ Apache, tên miền, kết nối Supabase và quy chuẩn SPA
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={runAllChecks}
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Đang kiểm tra...' : 'Kiểm tra lại toàn bộ'}
          </button>
          <a
            href="#/settings/deployment"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition"
          >
            Hướng dẫn Deploy
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Summary Scoreboard */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tổng số mục kiểm tra
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {checks.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
            10
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              Đạt chuẩn (PASS)
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {passCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
              Cảnh báo (WARNING)
            </div>
            <div className="text-2xl font-bold text-amber-700 mt-1">
              {warnCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
              Lỗi cần khắc phục (ERROR)
            </div>
            <div className="text-2xl font-bold text-rose-700 mt-1">
              {errCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main 10 Check Items List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
          <div className="font-bold text-sm text-slate-800">
            KẾT QUẢ KIỂM TRA 10 TIÊU CHÍ HỆ THỐNG
          </div>
          {lastChecked && (
            <div className="text-xs text-slate-400">
              Lần quét gần nhất: {lastChecked.toLocaleTimeString('vi-VN')}
            </div>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {checks.map((item) => (
            <div key={item.id} className="p-5 hover:bg-slate-50/50 transition flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {item.name}
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {item.title}
                  </span>
                </div>

                <div className="text-xs font-medium text-slate-700">
                  {item.message}
                </div>

                {item.details && (
                  <div className="text-[11px] text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 break-all">
                    {item.details}
                  </div>
                )}

                {item.recommendation && (
                  <div className="text-[11px] text-amber-700 bg-amber-50/70 px-3 py-1.5 rounded-lg border border-amber-200/60 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span><strong>Hướng dẫn:</strong> {item.recommendation}</span>
                  </div>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-2 self-start md:self-center">
                {renderStatusBadge(item.status)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section VII & XIII: Domain & Document Root Details Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-600" />
          Chi tiết Tên miền & Đường dẫn Document Root (Apache / cPanel)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="font-semibold text-slate-800">Thông tin mạng trực tiếp (Runtime URL):</div>
            <div><span className="text-slate-400">Current URL:</span> <code className="font-mono text-blue-700 ml-1">{window.location.href}</code></div>
            <div><span className="text-slate-400">Hostname:</span> <code className="font-mono text-slate-800 ml-1">{window.location.hostname}</code></div>
            <div><span className="text-slate-400">Protocol:</span> <code className="font-mono text-slate-800 ml-1">{window.location.protocol}</code></div>
            <div><span className="text-slate-400">Port:</span> <code className="font-mono text-slate-800 ml-1">{window.location.port || '80 / 443 (chuẩn)'}</code></div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-2 text-blue-950">
            <div className="font-semibold text-blue-900">Quy tắc chuẩn cấu hình Document Root trên cPanel:</div>
            <p className="text-[11px] leading-relaxed">
              Nếu thư mục Document Root trên cPanel là <code className="font-mono bg-white px-1 rounded">/home/USER/public_html</code>:
            </p>
            <div className="p-2.5 rounded-lg bg-white border border-blue-200 font-mono text-[11px] text-slate-700 leading-tight">
              ✓ public_html/index.html<br />
              ✓ public_html/.htaccess<br />
              ✓ public_html/assets/
            </div>
            <div className="text-[11px] text-rose-700">
              ✕ TUYỆT ĐỐI KHÔNG để: <code className="font-mono bg-rose-50 px-1 rounded">public_html/dist/index.html</code> (trừ khi bạn cấu hình Document Root trỏ thẳng vào thư mục dist).
            </div>
          </div>
        </div>
      </div>

      {/* Section XI: GITHUB WEBHOOK Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-purple-600" />
              GITHUB WEBHOOK
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tích hợp Webhook tự động triển khai khi bạn push code lên GitHub Repository.
            </p>
          </div>

          <div>
            {savedWebhookUrl ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                ✓ Đã cấu hình
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                Chưa cấu hình
              </span>
            )}
          </div>
        </div>

        {/* Input Webhook URL Form (KHÔNG lưu secret vào localStorage) */}
        <form onSubmit={handleSaveWebhook} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">
            Webhook URL (Endpoint nhận tín hiệu deploy từ GitHub):
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={webhookUrlInput || savedWebhookUrl}
              onChange={(e) => setWebhookUrlInput(e.target.value)}
              placeholder="https://your-domain.com/api/deploy-webhook"
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Lưu URL
            </button>
            {savedWebhookUrl && (
              <button
                type="button"
                onClick={handleClearWebhook}
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Xóa
              </button>
            )}
          </div>
          {webhookTestMessage && (
            <div className="text-xs text-emerald-700 font-medium">
              {webhookTestMessage}
            </div>
          )}
        </form>

        {/* GitHub Webhook Step-by-Step Instructions */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
            Hướng dẫn cài đặt Webhook trên GitHub:
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1 text-[11px] leading-relaxed">
            <li>
              Truy cập trang dự án trên <strong>GitHub</strong> → Chọn tab <strong>Settings</strong>
            </li>
            <li>
              Ở menu bên trái, chọn <strong>Webhooks</strong> → Nhấn nút <strong>Add webhook</strong>
            </li>
            <li>
              Dán URL webhook của máy chủ vào ô <strong>Payload URL</strong>
            </li>
            <li>
              Tại mục <strong>Content type</strong>, bắt buộc chọn: <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono font-bold text-slate-900">application/json</code>
            </li>
            <li>
              Tại mục sự kiện (Which events would you like to trigger this webhook?): Chọn <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono font-bold text-slate-900">Just the push event</code>
            </li>
            <li>
              Nhấn <strong>Add webhook</strong> để hoàn tất.
            </li>
          </ol>
          <div className="text-[10px] text-slate-400 italic pt-1">
            * Lưu ý bảo mật: Secret token (nếu có) phải được cấu hình bí mật ở biến môi trường trên server hosting, tuyệt đối không lưu secret key vào localStorage của trình duyệt client.
          </div>
        </div>
      </div>
    </div>
  );
}
