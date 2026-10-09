import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { googleFormService } from '../services/googleFormService';
import { resourceService } from '../services/resourceService';
import { GoogleFormConfig, Resource } from '../types';
import {
  UploadCloud,
  ExternalLink,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  AlertCircle,
  FolderOpen,
  PlusCircle,
  Sparkles,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { formatVietnamDate, getResourceStatusInfo } from '../utils/formatters';

export function UploadResourcePage() {
  const { profile } = useAuth();
  const toast = useToast();
  const [config, setConfig] = useState<GoogleFormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [myRecentUploads, setMyRecentUploads] = useState<Resource[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'recent' | 'guide'>('form');

  useEffect(() => {
    loadConfig();
    loadRecentUploads();
  }, [profile]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await googleFormService.getConfig(profile);
      setConfig(data);
    } catch (err) {
      console.error('Failed to load Google Form config:', err);
    } finally {
      setLoading(false);
    }
  };

  const isManager = profile?.role === 'ADMIN' || profile?.role === 'SCHOOL_ADMIN' || profile?.role === 'VICE_PRINCIPAL';

  const loadRecentUploads = async (showToast: boolean = false, force: boolean = false) => {
    if (!profile || loadingRecent) return;
    try {
      setLoadingRecent(true);
      // 1. Sync from backend and Google Sheet
      await googleFormService.syncFromBackend(profile, force);
      const sheetResult = await googleFormService.syncFromGoogleSheet(
        '1gH6zehWNY4pWn9bEzslTBI5ROBzr8Q_Cpug-T5b-8BU',
        profile,
        profile.email || 'ducminh1973@gmail.com',
        force
      );

      // 2. Query resources (Managers see all form submissions, Teachers see their own)
      const queryParams: any = {
        source_type: 'google_form',
        pageSize: 30,
        sortBy: 'created_at_desc',
      };
      if (!isManager && profile.id) {
        queryParams.owner_id = profile.id;
      }

      const res = await resourceService.getResources(profile, queryParams);

      let items = res.data.filter((r) => r.source_type === 'google_form');
      if (items.length === 0) {
        const myAll = await resourceService.getMyResources(profile, 'all');
        items = myAll.filter((r) => r.source_type === 'google_form');
      }

      setMyRecentUploads(items);

      if (showToast) {
        if (sheetResult.syncedCount > 0) {
          toast?.success?.(`Đã đồng bộ ${sheetResult.syncedCount} tài nguyên mới từ Google Form!`);
        } else {
          toast?.info?.('Đã kiểm tra và làm mới dữ liệu từ biểu mẫu Google Form.');
        }
      }
    } catch (err) {
      console.warn('Could not load recent uploads:', err);
    } finally {
      setLoadingRecent(false);
    }
  };

  const getEmbedUrl = (rawUrl?: string) => {
    if (!rawUrl) return '';
    let url = rawUrl.trim();
    if (url.includes('forms.gle/WP9FEjfZ64z2Wtf68')) {
      return 'https://docs.google.com/forms/d/e/1FAIpQLSdcw1ubQEIswQIgB1Pbi5LUWtToCNDwpmgQiJbuJFB66sE8mQ/viewform?embedded=true';
    }
    if (!url.includes('embedded=true') && url.includes('viewform')) {
      url += url.includes('?') ? '&embedded=true' : '?embedded=true';
    }
    return url;
  };

  const embedUrl = getEmbedUrl(config?.form_url);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Section 19: Header Section */}
      <div className="text-center py-6 sm:py-8 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200/80 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Thu thập & Quản lý Học liệu Số Chuẩn GDPT 2018</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Tải tài nguyên
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
          Chia sẻ bài giảng, học liệu và các tài nguyên số với đồng nghiệp trong nhà trường.
        </p>
      </div>

      {/* Hero Banner Callout Card */}
      <div className="bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 rounded-2xl border border-blue-100 p-6 sm:p-8 text-center shadow-2xs">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-3.5 shadow-md shadow-blue-500/20">
          <UploadCloud className="w-7 h-7" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
          Gửi tài nguyên của bạn
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
          Điền biểu mẫu để gửi tài nguyên vào hệ thống quản lý. Học liệu sẽ được tự động đồng bộ và chuyển tiếp tới Tổ trưởng thẩm định chuyên môn.
        </p>

        {/* Tab switch buttons */}
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`px-4 py-2 rounded-lg transition-smooth cursor-pointer ${
              activeTab === 'form'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Biểu mẫu Google Form
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('recent');
              loadRecentUploads(false);
            }}
            className={`px-4 py-2 rounded-lg transition-smooth cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'recent'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Tài nguyên vừa gửi</span>
            {myRecentUploads.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-bold">
                {myRecentUploads.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2 rounded-lg transition-smooth cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Quy định nộp bài
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'form' && (
        /* Section 20: Google Form Container */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-3 sm:p-5 transition-all duration-300">
          {/* Header of container */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3 py-2.5 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Google Form
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Đang hoạt động
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Tự động ghi nhận thông tin giáo viên và mã kiểm duyệt
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => loadRecentUploads(true, true)}
                disabled={loadingRecent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition border border-emerald-200 cursor-pointer disabled:opacity-50"
                title="Làm mới và kéo dữ liệu mới nhất từ Google Form vào hệ thống"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRecent ? 'animate-spin' : ''}`} />
                <span>Đồng bộ từ Google Form</span>
              </button>

              {config?.form_url && (
                <a
                  href={config.form_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-slate-200/80 transition shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở biểu mẫu tab mới</span>
                </a>
              )}

              <a
                href="#/resources/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition border border-blue-200/80"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Nhập tay trong app</span>
              </a>
            </div>
          </div>

          {/* Sync guidance banner */}
          <div className="mx-3 mb-3 p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-xs text-blue-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Sau khi nhấn <strong>Gửi</strong> trên biểu mẫu, nhấn <strong>"Đồng bộ từ Google Form"</strong> để cập nhật ngay vào tài khoản!</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('recent');
                loadRecentUploads(true, true);
              }}
              className="text-blue-700 font-bold hover:underline shrink-0 text-xs ml-2 cursor-pointer"
            >
              Xem kết quả nộp &rarr;
            </button>
          </div>

          {/* Iframe or Loading State */}
          <div className="relative min-h-[750px] w-full bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
            {!iframeLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-50">
                <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs font-semibold text-slate-600">
                  Đang tải biểu mẫu Google Form...
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Vui lòng chờ trong giây lát
                </p>
              </div>
            )}

            {embedUrl ? (
              <iframe
                src={embedUrl}
                title="Google Form Nộp Học Liệu"
                className="w-full min-h-[800px] border-0"
                onLoad={() => setIframeLoaded(true)}
              />
            ) : (
              <div className="p-12 text-center">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800">
                  Chưa cấu hình đường link Google Form
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Quản trị viên có thể cấu hình biểu mẫu trong mục Cài đặt hệ thống.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Recent Submissions */}
      {activeTab === 'recent' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Tài nguyên vừa gửi từ Google Form
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Các học liệu đã được đồng bộ tự động vào tài khoản của thầy/cô
              </p>
            </div>
            <button
              onClick={() => loadRecentUploads(true, true)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${loadingRecent ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {myRecentUploads.length === 0 ? (
            <div className="py-12 text-center">
              <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Chưa có bài nộp nào gần đây qua Google Form.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {myRecentUploads.map((r) => {
                const statusInfo = getResourceStatusInfo(r.status);
                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      window.location.hash = `#/resources/${r.id}`;
                    }}
                    className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 px-3 -mx-3 rounded-xl transition cursor-pointer"
                  >
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm hover:text-blue-600 transition truncate">
                        {r.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span>{r.subject?.name || 'Môn học'}</span>
                        <span>·</span>
                        <span>{r.grade?.name || 'Khối'}</span>
                        <span>·</span>
                        <span>{formatVietnamDate(r.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.badgeClass}`}>
                        {statusInfo.label}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Guidelines */}
      {activeTab === 'guide' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Quy trình & Tiêu chuẩn Nộp học liệu số
              </h3>
              <p className="text-xs text-slate-500">
                Tuân thủ quy định kiểm định chuyên môn tại Trường TH&THCS Nguyễn Đình Anh
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                1
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Lưu trữ trên Google Drive</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tải tệp bài giảng (PPT, Word, PDF, Video) lên Google Drive của bạn hoặc thư mục dùng chung của trường, mở quyền "Người có liên kết có thể xem".
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                2
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Điền biểu mẫu Google Form</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Nhập tiêu đề bài dạy theo công văn 5512, chọn đúng môn học, khối lớp, loại học liệu và dán liên kết Google Drive tương ứng.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                3
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Thẩm định 2 cấp</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tài nguyên sẽ được Tổ trưởng chuyên môn thẩm định đạt, chuyển Ban Giám hiệu phê duyệt chính thức và tạo mã QR chia sẻ toàn trường.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
