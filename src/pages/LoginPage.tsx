import React, { useState } from 'react';
import { AuthLayout } from '../layouts/AuthLayout';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import {
  Mail,
  Lock,
  Loader2,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

export function LoginPage() {
  const { signIn, loading } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMessage('Vui lòng nhập địa chỉ Email.');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signIn(email, password);
      toast.success('Đăng nhập thành công! Chào mừng bạn trở lại.');
      window.location.hash = '#/';
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập không thành công.');
      toast.error(err.message || 'Lỗi đăng nhập');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="HỆ THỐNG QUẢN LÝ TÀI NGUYÊN SỐ"
      subtitle="Đăng nhập tài khoản cán bộ, giáo viên và nhân viên nhà trường"
      maxWidth="sm:max-w-md"
    >
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      <div className="space-y-6">
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Email giáo viên / Quản trị
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ten.giaovien@thcs.edu.vn"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Mật khẩu
              </label>
              <a
                href="#/forgot-password"
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
              >
                Quên mật khẩu?
              </a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 transition duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xác thực...
              </>
            ) : (
              <>
                ĐĂNG NHẬP
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security & Access Notice */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Bảo mật đa cấp độ (RBAC & RLS)
          </div>
          <p className="leading-relaxed">
            Hệ thống tự động phân quyền truy cập theo Tổ chuyên môn và Phân cấp quản lý giáo dục của nhà trường.
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
