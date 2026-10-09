import React from 'react';
import { Clock, ArrowLeft, Home, Sparkles } from 'lucide-react';

interface PlaceholderFeaturePageProps {
  title: string;
  description: string;
}

export function PlaceholderFeaturePage({ title, description }: PlaceholderFeaturePageProps) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4 border border-amber-200">
        <Clock className="w-8 h-8" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 mb-3">
        <Sparkles className="w-3.5 h-3.5" />
        Phiên bản 2.0 sắp tới
      </div>

      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">{title}</h1>
      <p className="text-xs sm:text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-md w-full mb-6 text-xs text-slate-600 text-left">
        <strong className="text-slate-800 block mb-1">Quy định triển khai:</strong>
        Tính năng sẽ được phát triển ở phiên bản tiếp theo sau khi hoàn thiện vững chắc nền tảng Authentication, Database, RBAC và Row Level Security.
      </div>

      <a
        href="#/"
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition shadow-xs"
      >
        <Home className="w-4 h-4" />
        Quay lại Trang chủ
      </a>
    </div>
  );
}
