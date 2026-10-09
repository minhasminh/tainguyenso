import React from 'react';
import { Loader2, School } from 'lucide-react';

export function LoadingScreen({ message = 'Đang tải dữ liệu hệ thống...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 text-indigo-600 shadow-inner">
          <School className="w-8 h-8" />
        </div>
        <h2 className="text-base font-semibold text-slate-800 mb-1">Quản lý Tài nguyên số Giáo viên</h2>
        <p className="text-xs text-slate-500 mb-6">Trường Tiểu học và Trung học Cơ sở</p>
        <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
}
