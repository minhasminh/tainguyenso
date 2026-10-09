import React, { useEffect, useState } from 'react';
import { auditLogService } from '../../services/auditLogService';
import { Profile, UserRole } from '../../types';
import { formatVietnamDateTime } from '../../utils/formatters';
import {
  History,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  XCircle,
  FileEdit,
  PlusCircle,
  Archive,
  QrCode,
  Download,
  Printer,
  Copy,
  Share2,
  Loader2,
  Shield,
  FileText,
} from 'lucide-react';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole?: UserRole;
  actionTitle: string;
  actionType: string;
  comment?: string | null;
  badgeClass: string;
  icon: React.ElementType;
}

interface ResourceHistoryTimelineProps {
  resourceId: string;
  callerProfile: Profile | null;
}

export function ResourceHistoryTimeline({ resourceId, callerProfile }: ResourceHistoryTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      try {
        const data = await auditLogService.getResourceHistory(resourceId, callerProfile);
        setEvents(data);
      } catch (err) {
        console.error('Failed to load resource history:', err);
      } finally {
        setLoading(false);
      }
    }

    if (resourceId) {
      loadHistory();
    }
  }, [resourceId, callerProfile]);

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
        <span>Đang nạp lịch sử hoạt động & phê duyệt...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-10 text-center text-slate-500 text-xs">
        Chưa có sự kiện nào được ghi nhận cho tài nguyên này.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Lịch Sử Thao Tác & Phê Duyệt (Append-Only)
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {events.length} mốc sự kiện
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {events.map((ev, index) => {
          const Icon = ev.icon;
          return (
            <div key={ev.id || index} className="relative group">
              {/* Dot Icon on the line */}
              <div
                className={`absolute -left-6 top-0 w-5 h-5 rounded-full border-2 border-white ring-2 ring-slate-100 flex items-center justify-center ${ev.badgeClass}`}
              >
                <Icon className="w-2.5 h-2.5" />
              </div>

              {/* Event Box */}
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-slate-900">
                      {ev.actorName}
                    </span>
                    {ev.actorRole && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 rounded">
                        {ev.actorRole}
                      </span>
                    )}
                    <span className="text-xs font-medium text-slate-700">
                      • {ev.actionTitle}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-300" />
                    {formatVietnamDateTime(ev.timestamp)}
                  </span>
                </div>

                {/* Comment or feedback text */}
                {ev.comment && (
                  <div className="mt-2 text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed font-sans">
                    <span className="font-semibold text-slate-900 block text-[11px] text-slate-400 mb-0.5">
                      Ý kiến nhận xét / Ghi chú:
                    </span>
                    {ev.comment}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-slate-100/60 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 flex items-center gap-2">
        <Shield className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span>
          Nhật ký hoạt động và lịch sử phê duyệt được lưu vết bất biến. Không người dùng nào có quyền chỉnh sửa hoặc xóa lịch sử này.
        </span>
      </div>
    </div>
  );
}
