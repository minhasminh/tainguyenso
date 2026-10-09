import React from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  FolderOpen,
  Send,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { DashboardKPIs, Profile } from '../../types';

interface KPIGridProps {
  kpis: DashboardKPIs;
  profile: Profile | null;
  onNavigateToResources: (statusFilter?: string) => void;
}

export function KPIGrid({ kpis, profile, onNavigateToResources }: KPIGridProps) {
  const role = profile?.role;
  const isTeacher = role === 'TEACHER';
  const isSubjectLeader = role === 'SUBJECT_LEADER' || role === 'VICE_SUBJECT_LEADER';
  const isSchoolAdmin = role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL';

  // Compute approval rate
  const approvalRate =
    kpis.total > 0 ? Math.round((kpis.approved / kpis.total) * 100) : 0;

  return (
    <div className="space-y-4 mb-6">
      {/* 4 Primary High-Impact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Tổng tài nguyên */}
        <div
          onClick={() => onNavigateToResources('all')}
          className="group relative bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs card-hover cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {isTeacher ? 'Tài nguyên cá nhân' : 'Tổng tài nguyên'}
              </span>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {kpis.total}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Toàn bộ tài liệu số đã đưa lên kho
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-medium">
            <span>+{kpis.createdThisMonth} tài nguyên tháng này</span>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>

        {/* 2. Tài nguyên của tôi / Khối lượng của tổ */}
        <div
          onClick={() => onNavigateToResources('my')}
          className="group relative bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs card-hover cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {isTeacher ? 'Đã khởi tạo' : 'Tài nguyên của tôi'}
              </span>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <FolderOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {isTeacher ? kpis.total : (kpis.draft + kpis.pendingSubjectLeader + kpis.approved)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Kế hoạch bài dạy & bài giảng của thầy/cô
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-medium">
            <span>Quản lý học liệu cá nhân</span>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>

        {/* 3. Đang chờ thẩm định / phê duyệt */}
        <div
          onClick={() =>
            onNavigateToResources(
              isSchoolAdmin
                ? 'pending_school_approval'
                : isSubjectLeader
                ? 'submitted'
                : 'submitted,pending_school_approval'
            )
          }
          className="group relative bg-white rounded-2xl border border-amber-200/80 p-5 shadow-2xs card-hover cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                {isSchoolAdmin ? 'Cần BGH duyệt' : isSubjectLeader ? 'Cần Tổ duyệt' : 'Đang chờ duyệt'}
              </span>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-extrabold text-amber-800 tracking-tight">
                {kpis.pendingSubjectLeader + kpis.pendingSchool}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {kpis.pendingSubjectLeader} chờ Tổ • {kpis.pendingSchool} chờ BGH
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-between text-xs text-amber-700 font-medium">
            <span>Theo dõi tiến độ thẩm định</span>
            <ArrowUpRight className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>

        {/* 4. Đã được phê duyệt chính thức */}
        <div
          onClick={() => onNavigateToResources('approved')}
          className="group relative bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-2xs card-hover cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Đã được phê duyệt
              </span>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-800 tracking-tight">
                  {kpis.approved}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                  {approvalRate}% kho
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Đã duyệt chính thức & có mã QR
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs text-emerald-700 font-medium">
            <span>+{kpis.approvedThisMonth} duyệt tháng này</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
