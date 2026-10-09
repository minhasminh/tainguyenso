import React from 'react';
import { ShieldAlert, ArrowLeft, Home, UserCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getRoleInfo } from '../utils/formatters';
import { UserRole } from '../types';

interface PermissionDeniedProps {
  allowedRoles?: UserRole[];
  currentRole?: UserRole | null;
  onNavigateHome?: () => void;
}

export function PermissionDenied({
  allowedRoles = ['ADMIN', 'SCHOOL_ADMIN'],
  currentRole,
  onNavigateHome,
}: PermissionDeniedProps) {
  const { profile, switchDemoRole } = useAuth();
  const effectiveRole = currentRole || profile?.role;
  const currentRoleInfo = getRoleInfo(effectiveRole || undefined);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-5 border border-rose-200/60 shadow-xs">
        <ShieldAlert className="w-9 h-9" />
      </div>

      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
        Bạn không có quyền truy cập chức năng này
      </h1>

      <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
        Chức năng này được bảo vệ bởi cơ chế phân quyền (RBAC) và chính sách Row Level Security (RLS) của cơ sở dữ liệu.
      </p>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md w-full mb-6 text-left text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Vai trò hiện tại của bạn:</span>
          <span className={`px-2.5 py-0.5 rounded-full font-semibold border ${currentRoleInfo.badgeClass}`}>
            {currentRoleInfo.label} ({effectiveRole || 'Không xác định'})
          </span>
        </div>
        <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-200/80">
          <span className="text-slate-500 font-medium">Yêu cầu một trong các vai trò:</span>
          <div className="flex flex-wrap gap-1 justify-end">
            {allowedRoles.map((r) => {
              const inf = getRoleInfo(r);
              return (
                <span key={r} className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-medium">
                  {inf.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => onNavigateHome ? onNavigateHome() : (window.location.hash = '#/')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-xs cursor-pointer"
        >
          <Home className="w-4 h-4" />
          Về Trang chủ
        </button>

        <button
          onClick={() => (window.location.hash = '#/profile')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition cursor-pointer"
        >
          <UserCheck className="w-4 h-4" />
          Xem Hồ sơ cá nhân
        </button>
      </div>

      {/* Helpful developer/tester role switcher */}
      <div className="mt-8 pt-6 border-t border-slate-200 max-w-md w-full text-xs text-slate-500">
        <p className="mb-2 font-medium">Kiểm thử nhanh phân quyền (Chuyển vai trò thử nghiệm):</p>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {(['ADMIN', 'SCHOOL_ADMIN', 'VICE_PRINCIPAL', 'SUBJECT_LEADER', 'VICE_SUBJECT_LEADER', 'TEACHER'] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => switchDemoRole(r)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition cursor-pointer"
            >
              Chuyển sang {getRoleInfo(r).label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
