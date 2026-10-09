import React from 'react';
import { History, User, CheckCircle2, Clock, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import { RecentActivityItem, Resource } from '../../types';
import { formatRelativeTime } from '../../utils/formatters';

interface RecentActivitiesWidgetProps {
  activities: RecentActivityItem[];
  onSelectResource?: (resourceId: string) => void;
}

export function RecentActivitiesWidget({
  activities,
  onSelectResource,
}: RecentActivitiesWidgetProps) {
  const getActionIcon = (actionText: string) => {
    if (actionText.includes('phê duyệt') || actionText.includes('thẩm định')) {
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
    }
    if (actionText.includes('chỉnh sửa')) {
      return <AlertCircle className="w-3.5 h-3.5 text-amber-600" />;
    }
    if (actionText.includes('từ chối')) {
      return <AlertCircle className="w-3.5 h-3.5 text-rose-600" />;
    }
    if (actionText.includes('gửi duyệt')) {
      return <Clock className="w-3.5 h-3.5 text-blue-600" />;
    }
    return <FileText className="w-3.5 h-3.5 text-indigo-600" />;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Hoạt động Gần đây</h3>
              <p className="text-xs text-slate-500">Nhật ký thẩm định, phê duyệt và tải lên tài nguyên</p>
            </div>
          </div>
        </div>

        {activities.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Chưa có hoạt động nào được ghi nhận gần đây.
          </div>
        ) : (
          <div className="flow-root">
            <ul className="-mb-4">
              {activities.slice(0, 7).map((item, idx) => (
                <li key={item.id} className="relative pb-4">
                  {idx !== activities.slice(0, 7).length - 1 ? (
                    <span
                      className="absolute top-4 left-3 -ml-px h-full w-0.5 bg-slate-200"
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="relative flex items-start space-x-3">
                    <div className="relative">
                      <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center ring-4 ring-white">
                        {getActionIcon(item.actionText)}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs">
                        <span className="font-semibold text-slate-800">{item.userName}</span>{' '}
                        <span className="text-slate-600">{item.actionText.toLowerCase()}</span>
                      </div>
                      <div className="mt-0.5">
                        <button
                          type="button"
                          onClick={() => item.resourceId && onSelectResource && onSelectResource(item.resourceId)}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 truncate block max-w-full text-left cursor-pointer"
                        >
                          {item.resourceTitle}
                        </button>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{formatRelativeTime(item.timestamp || item.time)}</span>
                        {item.statusBadge && (
                          <span className={`px-1.5 py-0.2 rounded text-[9px] ${item.statusBadge.badgeClass}`}>
                            {item.statusBadge.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
