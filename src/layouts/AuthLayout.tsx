import React from 'react';
import { School, ShieldCheck } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  maxWidth?: string;
}

export function AuthLayout({ children, title, subtitle, maxWidth = 'sm:max-w-md' }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/40 to-slate-100 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className={`sm:mx-auto sm:w-full ${maxWidth} text-center px-4`}>
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200 mb-4">
          <School className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          QUẢN LÝ TÀI NGUYÊN SỐ GIÁO VIÊN
        </h1>
        <p className="mt-1.5 text-xs text-slate-600 font-medium">
          Trường Tiểu học và Trung học Cơ sở &bull; Nền tảng Phân quyền RBAC & RLS
        </p>
      </div>

      <div className={`mt-6 sm:mx-auto sm:w-full ${maxWidth} px-4 sm:px-0`}>
        <div className="bg-white py-8 px-6 sm:px-8 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          </div>

          {children}
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          Phiên bản 1.0 &bull; Supabase Auth &bull; PostgreSQL Row Level Security
        </div>
      </div>
    </div>
  );
}
