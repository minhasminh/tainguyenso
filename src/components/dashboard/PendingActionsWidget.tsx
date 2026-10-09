import React from 'react';
import {
  AlertCircle,
  Clock,
  ArrowRight,
  CheckCircle2,
  User,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { Resource, Profile } from '../../types';
import { getStatusBadge } from '../../utils/formatters';

interface PendingActionsWidgetProps {
  resources: Resource[];
  profile: Profile | null;
  onViewResource: (resource: Resource) => void;
  onReviewResource?: (resource: Resource) => void;
}

export function PendingActionsWidget({
  resources,
  profile,
  onViewResource,
  onReviewResource,
}: PendingActionsWidgetProps) {
  const role = profile?.role;
  const isTeacher = role === 'TEACHER';
  const isSubjectLeader = role === 'SUBJECT_LEADER';
  const isViceSubjectLeader = role === 'VICE_SUBJECT_LEADER';
  const isDepartmentLeader = isSubjectLeader || isViceSubjectLeader;
  const isSchoolAdmin = role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL';

  const getWidgetTitle = () => {
    if (isTeacher) return 'Tài nguyên cần hoàn thiện / nộp lại';
    if (isDepartmentLeader) return 'Tài nguyên trong tổ chờ Thẩm định';
    if (isSchoolAdmin) return 'Hồ sơ chờ Ban Giám hiệu phê duyệt';
    return 'Tài nguyên đang trong luồng phê duyệt';
  };

  const getActionLabel = (res: Resource) => {
    if (isTeacher) {
      return res.status === 'revision_required' ? 'Sửa & nộp lại' : 'Hoàn thiện';
    }
    if (isSchoolAdmin || isDepartmentLeader) {
      return 'Thẩm định ngay';
    }
    return 'Xem chi tiết';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {getWidgetTitle()}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhiệm vụ ưu tiên để đảm bảo tiến độ giảng dạy
              </p>
            </div>
          </div>
          {resources.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200/60">
              {resources.length} cần xử lý
            </span>
          )}
        </div>

        {resources.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 shadow-2xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">Mọi thứ đã hoàn tất!</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
              Hiện không có tài nguyên nào tồn đọng cần thẩm định hoặc điều chỉnh trong tổ của thầy/cô.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {resources.slice(0, 5).map((res) => {
              const statusInfo = getStatusBadge(res.status);
              const isRevision = res.status === 'revision_required';

              return (
                <div
                  key={res.id}
                  className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1 text-xs">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusInfo.badgeClass}`}
                      >
                        {statusInfo.label}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500 text-[11px]">
                        {new Date(res.updated_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    <h4
                      onClick={() => onViewResource(res)}
                      className="font-bold text-slate-900 text-xs sm:text-sm hover:text-blue-600 transition-colors truncate cursor-pointer"
                    >
                      {res.title}
                    </h4>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-slate-400" />
                        <span>{res.subject?.name || 'Môn học'} · {res.grade?.name || 'Khối'}</span>
                      </span>
                      {res.owner && (
                        <span className="flex items-center gap-1 truncate">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{res.owner.full_name}</span>
                        </span>
                      )}
                    </div>

                    {isRevision && res.rejection_reason && (
                      <p className="text-[11px] text-amber-700 bg-amber-50/80 px-2 py-1 rounded-md mt-1.5 line-clamp-1 border border-amber-200/50">
                        Ý kiến: {res.rejection_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onReviewResource ? onReviewResource(res) : onViewResource(res)
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <span>{getActionLabel(res)}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {resources.length > 5 && (
        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
          <a
            href={
              isSchoolAdmin
                ? '#/resources?statuses=pending_school_approval'
                : isDepartmentLeader
                ? '#/resources?statuses=submitted'
                : '#/resources/my'
            }
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
          >
            Xem tất cả {resources.length} tài nguyên cần xử lý →
          </a>
        </div>
      )}
    </div>
  );
}
