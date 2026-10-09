import React, { useEffect, useState } from 'react';
import { resourceService } from '../services/resourceService';
import { Resource } from '../types';
import { detectResourceProvider, getProviderInfo } from '../utils/formatters';
import {
  ExternalLink,
  School,
  Lock,
  Loader2,
  BookOpen,
  GraduationCap,
  Calendar,
  Layers,
  ArrowLeft,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { shareResource } from '../utils/qrCodeHelper';

interface PublicResourcePageProps {
  token: string;
}

export function PublicResourcePage({ token }: PublicResourcePageProps) {
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Client-side rate-limit anti-abuse check: max 25 public lookups per minute
    const checkRateLimit = (): boolean => {
      try {
        const now = Date.now();
        const stored = sessionStorage.getItem('qr_lookups');
        const timestamps: number[] = stored ? JSON.parse(stored) : [];
        const recent = timestamps.filter((t) => now - t < 60000);
        if (recent.length >= 25) {
          return false;
        }
        recent.push(now);
        sessionStorage.setItem('qr_lookups', JSON.stringify(recent));
        return true;
      } catch {
        return true;
      }
    };

    async function loadResource() {
      if (!checkRateLimit()) {
        setRateLimited(true);
        setDenied(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setDenied(false);
      try {
        const found = await resourceService.getResourceByPublicToken(token);
        // Security check: Only approved and not archived resources can be viewed publicly
        if (!found || found.status !== 'approved') {
          setDenied(true);
          setResource(null);
        } else {
          setResource(found);
        }
      } catch (err) {
        setDenied(true);
        setResource(null);
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadResource();
    } else {
      setDenied(true);
      setLoading(false);
    }
  }, [token]);

  const handleOpenResource = () => {
    if (resource && resource.resource_url) {
      window.open(resource.resource_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleShare = async () => {
    if (!resource) return;
    try {
      const res = await shareResource(resource);
      if (res.method === 'clipboard') {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Ignored
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-200 flex flex-col items-center max-w-sm w-full">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
          <h2 className="text-base font-bold text-slate-800">Đang nạp dữ liệu tài nguyên...</h2>
          <p className="text-xs text-slate-400 mt-1">Hệ thống Cổng học liệu số TH&THCS</p>
        </div>
      </div>
    );
  }

  // Access denied or unapproved / archived (Section 4 & 37)
  if (denied || !resource) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-2">
            {rateLimited ? 'Yêu cầu quá nhanh' : 'Không thể truy cập tài nguyên'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
            {rateLimited
              ? 'Hệ thống phát hiện tần suất tra cứu quá cao. Vui lòng thử lại sau giây lát.'
              : 'Tài nguyên không tồn tại hoặc chưa được công khai.'}
          </p>
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2 justify-center">
            <a
              href="#/"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Về trang đăng nhập / Trang chủ
            </a>
          </div>
        </div>
      </div>
    );
  }

  const provider = detectResourceProvider(resource.resource_url);
  const pInfo = getProviderInfo(provider);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200/60 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Brand Banner */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 text-white px-6 py-6 text-center relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-2.5 shadow-xs border border-white/20">
            <School className="w-6 h-6 text-white" />
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-100">
            TRƯỜNG TH&THCS NGUYỄN ĐÌNH ANH
          </p>
          <h2 className="text-xs font-medium text-indigo-200 mt-0.5">
            Cổng Tra Cứu Học Liệu & Bài Giảng Số
          </h2>
        </div>

        {/* Content Body (Section 36 - Clean, no internal IDs or logs) */}
        <div className="p-6 sm:p-7 space-y-6">
          <div className="text-center space-y-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${pInfo.badgeClass}`}
            >
              <span>{pInfo.iconPrefix}</span>
              <span>{pInfo.label}</span>
              <span>• {resource.resource_type}</span>
            </span>

            <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
              {resource.title}
            </h1>

            {resource.topic && (
              <p className="text-xs font-medium text-indigo-600">
                Chủ đề: {resource.topic}
              </p>
            )}
          </div>

          {/* Description if present */}
          {resource.description && (
            <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed text-center">
              {resource.description}
            </p>
          )}

          {/* Summary Metadata Table */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">Môn học</span>
                <span className="font-semibold text-slate-800">{resource.subject?.name || '—'}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">Khối lớp</span>
                <span className="font-semibold text-slate-800">
                  {resource.grade?.name || '—'} {resource.class_name ? `(${resource.class_name})` : ''}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">Năm học</span>
                <span className="font-semibold text-slate-800">{resource.school_year || '—'}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">Loại học liệu</span>
                <span className="font-semibold text-slate-800">{resource.resource_type}</span>
              </div>
            </div>
          </div>

          {/* Big Action: MỞ TÀI NGUYÊN (Section 36) */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={handleOpenResource}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              MỞ TÀI NGUYÊN
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              {copied ? 'Đã sao chép liên kết vào bộ nhớ tạm' : 'Chia sẻ tài nguyên'}
            </button>
          </div>

          {/* Safe Badge */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-medium pt-2 border-t border-slate-100">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Học liệu số đã được thẩm định & phê duyệt chính thức
          </div>
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-400 mt-4">
        Hệ thống Quản lý Tài nguyên số Trường TH&THCS Nguyễn Đình Anh • Bảo mật & Tuân thủ GDPT 2018
      </div>
    </div>
  );
}
