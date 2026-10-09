import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LoadingScreen } from './LoadingScreen';
import { Lock, LogOut } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, profile, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !profile) && !fallback) {
      window.location.hash = '#/login';
    }
  }, [loading, user, profile, fallback]);

  if (loading) {
    return <LoadingScreen message="Đang xác thực phiên làm việc..." />;
  }

  if (!user || !profile) {
    if (fallback) return <>{fallback}</>;
    return <LoadingScreen message="Đang chuyển hướng về trang đăng nhập..." />;
  }

  // Account locked rule (soft disable)
  if (profile.status === 'locked' || profile.status === 'inactive') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-rose-200 p-6 text-center">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Tài khoản tạm thời bị khóa</h2>
          <p className="text-sm text-slate-600 mb-6">
            Tài khoản <span className="font-semibold text-slate-800">{profile.email}</span> của bạn đang ở trạng thái{' '}
            <span className="font-bold text-rose-600 uppercase">
              {profile.status === 'locked' ? 'Bị khóa' : 'Chưa kích hoạt'}
            </span>
            . Bạn không thể thực hiện các thao tác trên hệ thống. Vui lòng liên hệ Ban Giám hiệu hoặc Quản trị viên để được mở khóa.
          </p>
          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất khỏi hệ thống
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
