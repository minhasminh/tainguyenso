import React, { useState } from 'react';
import { AuthLayout } from '../layouts/AuthLayout';
import { Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { useToast } from '../hooks/useToast';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    toast.success('Đã gửi yêu cầu đặt lại mật khẩu');
  };

  return (
    <AuthLayout
      title="QUÊN MẬT KHẨU"
      subtitle="Nhập email trường học của bạn để nhận hướng dẫn khôi phục mật khẩu"
    >
      {submitted ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-sm text-slate-700">
            Nếu email <strong className="text-slate-900">{email}</strong> tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi đến hòm thư của bạn.
          </p>
          <p className="text-xs text-slate-500">
            Hoặc bạn có thể liên hệ trực tiếp Ban Giám hiệu / Quản trị viên để đặt lại mật khẩu nhanh chóng.
          </p>
          <a
            href="#/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại Đăng nhập
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Email giáo viên
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

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            GỬI YÊU CẦU
          </button>

          <div className="text-center pt-2">
            <a
              href="#/login"
              className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại màn hình đăng nhập
            </a>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
