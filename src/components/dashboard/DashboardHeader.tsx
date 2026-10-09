import React from 'react';
import {
  Download,
  RefreshCw,
  Clock,
  Sparkles,
  UploadCloud,
  FolderArchive,
} from 'lucide-react';
import { Profile } from '../../types';
import { getRoleInfo } from '../../utils/formatters';

interface DashboardHeaderProps {
  profile: Profile | null;
  lastUpdated: Date;
  isLoading: boolean;
  onRefresh: () => void;
  onExport: () => void;
}

export function DashboardHeader({
  profile,
  lastUpdated,
  isLoading,
  onRefresh,
  onExport,
}: DashboardHeaderProps) {
  const roleInfo = getRoleInfo(profile?.role);
  const canExport =
    profile?.role === 'ADMIN' ||
    profile?.role === 'SCHOOL_ADMIN' ||
    profile?.role === 'VICE_PRINCIPAL';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-6 sm:p-8 shadow-sm mb-6">
      {/* Background visual accents */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 -mb-16 w-60 h-60 rounded-full bg-indigo-400/20 blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Welcome message */}
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold text-blue-100 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Nền tảng Giáo dục số 4.0 • GDPT 2018</span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white leading-tight">
            Xin chào, {profile?.full_name || 'Quý Thầy/Cô'} 👋
          </h1>

          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
            Trung tâm Quản lý & Chia sẻ Tài nguyên số — Trường TH&THCS Nguyễn Đình Anh. Tra cứu học liệu, thẩm định chuyên môn và lưu trữ kế hoạch bài dạy tập trung.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <span className="text-xs text-blue-200/90 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-300" />
              <span>Cập nhật: {lastUpdated.toLocaleTimeString('vi-VN')}</span>
            </span>
            <span className="text-blue-300/50">•</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 border border-white/30 text-white`}>
              {roleInfo.label}
            </span>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <a
            href="#/upload-resource"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 text-xs sm:text-sm font-semibold shadow-xs transition-smooth cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-blue-600" />
            <span>Tải tài nguyên</span>
          </a>

          <a
            href="#/resources"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs sm:text-sm font-semibold transition-smooth cursor-pointer"
          >
            <FolderArchive className="w-4 h-4 text-white" />
            <span>Kho tài nguyên</span>
          </a>

          {canExport && (
            <button
              onClick={onExport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold transition-smooth cursor-pointer"
              title="Xuất bảng số liệu CSV toàn trường"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Xuất CSV</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-smooth cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu thống kê"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
