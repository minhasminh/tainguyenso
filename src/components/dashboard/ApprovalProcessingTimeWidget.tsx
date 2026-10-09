import React from 'react';
import { Timer, CheckCircle, Clock, Zap, ArrowRight } from 'lucide-react';
import { ApprovalProcessingTimes } from '../../types';
import { formatDurationFromHours } from '../../utils/formatters';

interface ApprovalProcessingTimeWidgetProps {
  data: ApprovalProcessingTimes;
}

export function ApprovalProcessingTimeWidget({ data }: ApprovalProcessingTimeWidgetProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Thời gian Thẩm định & Phê duyệt Trung bình
            </h3>
            <p className="text-xs text-slate-500">
              Theo dõi hiệu quả phối hợp chuyên môn 2 cấp: Tổ chuyên môn → Ban Giám hiệu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md font-medium border border-emerald-200">
            {data.completedCount} đã hoàn tất
          </span>
          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-medium border border-blue-200">
            {data.processingCount} đang xử lý
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Step 1: Tổ trưởng */}
        <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/60 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">1. Cấp Tổ chuyên môn</span>
            <div className="text-lg font-bold text-slate-800 mt-0.5">
              {formatDurationFromHours(data.avgSubjectLeaderHours)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Từ lúc giáo viên nộp đến khi Tổ trưởng thẩm định
            </p>
          </div>
        </div>

        {/* Step 2: BGH */}
        <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/60 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-100 text-purple-700 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">2. Cấp Ban Giám hiệu</span>
            <div className="text-lg font-bold text-slate-800 mt-0.5">
              {formatDurationFromHours(data.avgSchoolHours)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Từ khi Tổ trưởng duyệt đến khi BGH phê duyệt
            </p>
          </div>
        </div>

        {/* Total Cycle */}
        <div className="p-3.5 rounded-lg border border-indigo-100 bg-indigo-50/40 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-indigo-700 font-medium">Toàn bộ quy trình</span>
            <div className="text-lg font-bold text-emerald-700 mt-0.5">
              {formatDurationFromHours(data.avgTotalHours)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Thời gian hoàn tất chu trình phê duyệt tài nguyên
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
